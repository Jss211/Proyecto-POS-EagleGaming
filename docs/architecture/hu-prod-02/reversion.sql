-- Reversión exacta. En producción preferir contencion.sql mientras se diagnostica.
-- Completar el SQL inverso a partir del inventario original, no del borrador.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, public;

LOCK TABLE public.profiles, public.products IN ACCESS EXCLUSIVE MODE;

DO $rollback$
DECLARE
  inventory_reviewed boolean := false;
  expected_function_ddl text := NULL; -- DDL desplegado de handle_new_user().
  original_function_ddl text := NULL; -- DDL exacto de postgres, proconfig NULL, rol CAJERO.
  original_policies jsonb := NULL; -- Las cuatro filas completas de pg_policies.
  original_role_default text := NULL; -- Expresión exacta, o '' si no había default.
  restore_original text[] := NULL;
  statement text;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Usa la sesión administrativa postgres del proyecto correcto';
  END IF;
  IF NOT inventory_reviewed OR expected_function_ddl IS NULL
     OR original_function_ddl IS NULL OR original_policies IS NULL
     OR original_role_default IS NULL OR restore_original IS NULL
     OR cardinality(restore_original) = 0 THEN
    RAISE EXCEPTION 'Faltan los insumos aprobados del rollback';
  END IF;

  IF pg_get_functiondef(to_regprocedure('public.handle_new_user()'))
       IS DISTINCT FROM expected_function_ddl THEN
    RAISE EXCEPTION 'La función de aprovisionamiento cambió desde el despliegue';
  END IF;

  -- Requiere rol administrativo con autoridad sobre los objetos nuevos.
  DROP FUNCTION public.register_product(jsonb);
  DROP FUNCTION public.can_register_product();
  DROP POLICY eagle_registrar_insert ON public.products;
  DROP POLICY eagle_registrar_return_id ON public.products;
  DROP POLICY eagle_registrar_profiles_read ON public.profiles;
  DROP POLICY eagle_products_read ON public.products;
  DROP POLICY eagle_profiles_own ON public.profiles;
  ALTER TABLE public.products DROP CONSTRAINT eagle_products_active_complete;
  DROP INDEX public.products_canonical_gtin_uidx;
  DROP FUNCTION product_registration_private.canonical_gtin(text);
  DROP TABLE product_registration_private.authorized_supervisors;
  DROP FUNCTION product_registration_private.session_uid();
  DROP SCHEMA product_registration_private;
  -- Usar solo si este rol sigue dedicado exclusivamente a esta migración.
  DROP OWNED BY eagle_product_registrar RESTRICT;
  DROP ROLE eagle_product_registrar;

  REVOKE SELECT (id, email, "fullName", role, "avatarUrl")
    ON public.profiles FROM authenticated;
  REVOKE SELECT (id, barcode, sku, name, description, category, price, stock,
                 "minStock", "isActive", "createdAt", "updatedAt")
    ON public.products FROM authenticated;

  EXECUTE original_function_ddl;
  -- Confirmado antes de la migración: RLS activo, sin FORCE, propietario postgres.
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;
  ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.products NO FORCE ROW LEVEL SECURITY;

  IF original_role_default = '' THEN
    ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
  ELSE
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT ' || original_role_default;
  END IF;

  -- Restaurar cuatro políticas y ACL exactos de tabla y
  -- función. El inventario confirmado no contiene grants por columna.
  FOREACH statement IN ARRAY restore_original LOOP
    EXECUTE statement;
  END LOOP;

  IF pg_get_functiondef(to_regprocedure('public.handle_new_user()'))
       IS DISTINCT FROM original_function_ddl OR (
    SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tablename, p.policyname)
    FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('profiles', 'products')
  ) IS DISTINCT FROM original_policies OR EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid IN ('public.profiles'::regclass, 'public.products'::regclass)
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'La reversión no reprodujo las políticas y función originales';
  END IF;
END;
$rollback$;

COMMIT;

