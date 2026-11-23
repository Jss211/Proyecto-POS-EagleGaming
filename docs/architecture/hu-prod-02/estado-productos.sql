-- HU-PROD-03 Fase 3. Ensayo manual como postgres.
-- Para instalar después de verificar el ensayo, reemplazar solo el ROLLBACK final.
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
    RAISE EXCEPTION 'Faltan RLS o la función privada de identidad de HU-PROD-02';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass AND conname = 'eagle_products_active_complete'
      AND contype = 'c' AND convalidated
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.products'::regclass AND attname = 'updatedAt'
      AND atttypid = 'timestamp without time zone'::regtype AND atttypmod = 3
      AND attnotnull AND NOT attisdropped
  ) OR EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.products'::regclass AND NOT tgisinternal AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Revisa la integridad de activación, updatedAt o los triggers de products';
  END IF;
END;
$preflight$;

CREATE ROLE eagle_product_status NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT eagle_product_status TO CURRENT_USER;

GRANT USAGE ON SCHEMA public, product_registration_private TO eagle_product_status;
GRANT EXECUTE ON FUNCTION product_registration_private.session_uid() TO eagle_product_status;
GRANT SELECT (id, role) ON public.profiles TO eagle_product_status;
GRANT SELECT (id, "isActive", "updatedAt"), UPDATE ("isActive", "updatedAt")
  ON public.products TO eagle_product_status;

CREATE POLICY eagle_status_profiles_self ON public.profiles
  FOR SELECT TO eagle_product_status
  USING (id::text = (SELECT product_registration_private.session_uid())::text);

CREATE FUNCTION public.can_set_product_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (SELECT product_registration_private.session_uid())::text
      AND p.role = 'ADMIN'
  );
$$;

CREATE POLICY eagle_status_products_read ON public.products
  FOR SELECT TO eagle_product_status USING ((SELECT public.can_set_product_active()));
CREATE POLICY eagle_status_products_update ON public.products
  FOR UPDATE TO eagle_product_status
  USING ((SELECT public.can_set_product_active()))
  WITH CHECK ((SELECT public.can_set_product_active()));

CREATE FUNCTION public.set_product_active(
  p_product_id text, p_expected_updated_at timestamp without time zone, p_active boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  found_id text;
  found_version timestamp without time zone;
  found_state boolean;
BEGIN
  IF NOT public.can_set_product_active() THEN
    RAISE EXCEPTION 'Cambio de estado no autorizado' USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_product_id), '') IS NULL OR p_expected_updated_at IS NULL
     OR NOT isfinite(p_expected_updated_at) OR p_active IS NULL THEN
    RAISE EXCEPTION 'Solicitud de estado inválida' USING ERRCODE = '22023';
  END IF;

  -- El CHECK existente valida los campos de un activo sin conceder lectura del costo.
  UPDATE public.products p
  SET "isActive" = p_active,
      "updatedAt" = greatest(p."updatedAt" + interval '1 millisecond',
                            date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC'))
  WHERE p.id = p_product_id AND p."updatedAt" = p_expected_updated_at
    AND p."isActive" IS DISTINCT FROM p_active
  RETURNING p.id, p."isActive" INTO found_id, found_state;

  IF NOT FOUND THEN
    SELECT p.id, p."updatedAt", p."isActive" INTO found_id, found_version, found_state
    FROM public.products p WHERE p.id = p_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El producto ya no está disponible' USING ERRCODE = 'P0002';
    END IF;
    IF found_version IS DISTINCT FROM p_expected_updated_at OR found_state IS DISTINCT FROM p_active THEN
      RAISE EXCEPTION 'El producto cambió' USING ERRCODE = '40001';
    END IF;
  END IF;

  RETURN jsonb_build_object('id', found_id, 'isActive', found_state);
END;
$$;

REVOKE ALL ON FUNCTION public.can_set_product_active(),
  public.set_product_active(text, timestamp without time zone, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_set_product_active(),
  public.set_product_active(text, timestamp without time zone, boolean)
  TO authenticated;

GRANT CREATE ON SCHEMA public TO eagle_product_status;
ALTER FUNCTION public.can_set_product_active() OWNER TO eagle_product_status;
ALTER FUNCTION public.set_product_active(text, timestamp without time zone, boolean)
  OWNER TO eagle_product_status;
REVOKE CREATE ON SCHEMA public FROM eagle_product_status;
REVOKE eagle_product_status FROM CURRENT_USER;

DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('authenticator')) r(name)
    WHERE pg_has_role(r.name, 'eagle_product_status', 'MEMBER')
  ) OR EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated')) r(name)
    WHERE has_any_column_privilege(r.name, 'public.products', 'INSERT, UPDATE')
       OR has_table_privilege(r.name, 'public.products', 'DELETE, TRUNCATE, TRIGGER')
       OR has_column_privilege(r.name, 'public.products', 'costPrice', 'SELECT')
  ) OR EXISTS (
    SELECT 1 FROM pg_attribute a WHERE a.attrelid = 'public.products'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attname NOT IN ('isActive', 'updatedAt')
      AND has_column_privilege('eagle_product_status', a.attrelid, a.attnum, 'UPDATE')
  ) OR has_any_column_privilege('eagle_product_status', 'public.products', 'INSERT')
    OR has_table_privilege('eagle_product_status', 'public.products', 'DELETE, TRUNCATE, TRIGGER')
    OR has_column_privilege('eagle_product_status', 'public.products', 'costPrice', 'SELECT')
    OR NOT has_function_privilege('eagle_product_status', 'product_registration_private.session_uid()', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.can_set_product_active()', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.set_product_active(text,timestamp without time zone,boolean)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.can_set_product_active()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.set_product_active(text,timestamp without time zone,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'La verificación de acceso de activación falló';
  END IF;
END;
$verify$;

ROLLBACK;
