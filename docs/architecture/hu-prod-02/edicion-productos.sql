-- HU-PROD-03 Fase 2. Aplicar manualmente como postgres tras revisar el impacto.
-- Para el ensayo de instalación, sustituir el COMMIT final por ROLLBACK.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, public;

LOCK TABLE public.profiles, public.products IN ACCESS EXCLUSIVE MODE;

DO $preflight$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Ejecuta como postgres en sistema-POS-EagleGaming';
  END IF;

  IF (SELECT count(*) FROM pg_class
      WHERE oid IN ('public.products'::regclass, 'public.profiles'::regclass)
        AND relrowsecurity) <> 2
     OR to_regprocedure('product_registration_private.session_uid()') IS NULL THEN
    RAISE EXCEPTION 'Faltan las protecciones de HU-PROD-02';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.products'::regclass AND attname = 'updatedAt'
      AND atttypid = 'timestamp without time zone'::regtype AND atttypmod = 3
      AND attnotnull AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_index i JOIN pg_attribute a
      ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
    WHERE i.indrelid = 'public.products'::regclass AND a.attname = 'sku'
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts = 1
      AND i.indpred IS NULL AND i.indexprs IS NULL
  ) OR EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.products'::regclass AND NOT tgisinternal AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Revisa updatedAt, la unicidad del SKU o los triggers de products';
  END IF;
END;
$preflight$;

CREATE ROLE eagle_product_editor NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT eagle_product_editor TO CURRENT_USER;

GRANT USAGE ON SCHEMA public, product_registration_private TO eagle_product_editor;
GRANT EXECUTE ON FUNCTION product_registration_private.session_uid() TO eagle_product_editor;
GRANT SELECT (id, role) ON public.profiles TO eagle_product_editor;
GRANT SELECT (id, "updatedAt"), UPDATE (name, sku, category, description, price, "updatedAt")
  ON public.products TO eagle_product_editor;

CREATE POLICY eagle_editor_profiles_self ON public.profiles
  FOR SELECT TO eagle_product_editor
  USING (id::text = (SELECT product_registration_private.session_uid())::text);

CREATE FUNCTION public.can_update_product()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (SELECT product_registration_private.session_uid())::text
      AND p.role = 'ADMIN'
  );
$$;

REVOKE ALL ON FUNCTION public.can_update_product() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_update_product() TO authenticated;

-- Los roles de navegador siguen sin UPDATE. Estas reglas solo aplican al editor interno.
CREATE POLICY eagle_editor_products_read ON public.products
  FOR SELECT TO eagle_product_editor USING ((SELECT public.can_update_product()));
CREATE POLICY eagle_editor_products_update ON public.products
  FOR UPDATE TO eagle_product_editor
  USING ((SELECT public.can_update_product()))
  WITH CHECK ((SELECT public.can_update_product()));

CREATE FUNCTION public.update_product(
  p_product_id text, p_expected_updated_at timestamp without time zone, p_changes jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  saved_id text;
  next_name text;
  next_category text;
  next_sku text;
  next_price text;
BEGIN
  IF NOT public.can_update_product() THEN
    RAISE EXCEPTION 'Edición no autorizada' USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_product_id), '') IS NULL OR p_expected_updated_at IS NULL
     OR NOT isfinite(p_expected_updated_at)
     OR jsonb_typeof(p_changes) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Solicitud de edición inválida' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_changes) AS k(key)
    WHERE k.key NOT IN ('name', 'sku', 'category', 'description', 'price')
  ) OR EXISTS (
    SELECT 1 FROM unnest(ARRAY['name', 'category', 'price']) AS k(key)
    WHERE jsonb_typeof(p_changes -> k.key) IS DISTINCT FROM 'string'
  ) OR EXISTS (
    SELECT 1 FROM unnest(ARRAY['sku', 'description']) AS k(key)
    WHERE NOT (p_changes ? k.key)
       OR jsonb_typeof(p_changes -> k.key) NOT IN ('null', 'string')
  ) THEN
    RAISE EXCEPTION 'Campos de edición inválidos' USING ERRCODE = '22023';
  END IF;

  next_name := btrim(p_changes ->> 'name');
  next_category := btrim(p_changes ->> 'category');
  next_sku := nullif(btrim(p_changes ->> 'sku'), '');
  next_price := p_changes ->> 'price';
  IF next_name !~ '[^[:space:]]' OR next_category !~ '[^[:space:]]'
     OR (next_sku IS NOT NULL AND next_sku !~ '^[^[:space:]]{1,128}$')
     OR next_price COLLATE "C" !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$' THEN
    RAISE EXCEPTION 'Datos comerciales inválidos' USING ERRCODE = '22023';
  END IF;

  UPDATE public.products p
  SET name = next_name, sku = next_sku, category = next_category,
      description = nullif(btrim(p_changes ->> 'description'), ''),
      price = next_price::numeric,
      "updatedAt" = greatest(p."updatedAt" + interval '1 millisecond',
                            date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC'))
  WHERE p.id = p_product_id AND p."updatedAt" = p_expected_updated_at
  RETURNING p.id INTO saved_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El producto cambió o ya no está disponible' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('id', saved_id);
END;
$$;

REVOKE ALL ON FUNCTION public.update_product(text, timestamp without time zone, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_product(text, timestamp without time zone, jsonb)
  TO authenticated;
GRANT CREATE ON SCHEMA public TO eagle_product_editor;
ALTER FUNCTION public.can_update_product() OWNER TO eagle_product_editor;
ALTER FUNCTION public.update_product(text, timestamp without time zone, jsonb)
  OWNER TO eagle_product_editor;
REVOKE CREATE ON SCHEMA public FROM eagle_product_editor;
REVOKE eagle_product_editor FROM CURRENT_USER;

DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('authenticator')) r(name)
    WHERE pg_has_role(r.name, 'eagle_product_editor', 'MEMBER')
  ) OR EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated')) r(name)
    WHERE has_any_column_privilege(r.name, 'public.products', 'UPDATE')
       OR has_column_privilege(r.name, 'public.products', 'costPrice', 'SELECT')
       OR has_column_privilege(r.name, 'public.profiles', 'role', 'UPDATE')
  ) OR EXISTS (
    SELECT 1 FROM (VALUES ('id'), ('barcode'), ('stock'), ('isActive'), ('costPrice')) c(name)
    WHERE has_column_privilege('eagle_product_editor', 'public.products', c.name, 'UPDATE')
  ) OR has_any_column_privilege('eagle_product_editor', 'public.products', 'INSERT')
    OR has_table_privilege('eagle_product_editor', 'public.products', 'DELETE, TRUNCATE, TRIGGER')
    OR has_column_privilege('eagle_product_editor', 'public.products', 'costPrice', 'SELECT')
    OR has_any_column_privilege('eagle_product_editor', 'public.profiles', 'UPDATE')
    OR NOT has_function_privilege('eagle_product_editor',
         'product_registration_private.session_uid()', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.can_update_product()', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.update_product(text,timestamp without time zone,jsonb)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.can_update_product()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.update_product(text,timestamp without time zone,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'La verificación de acceso de edición falló';
  END IF;
END;
$verify$;

COMMIT;
