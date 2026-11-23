-- Ejecutar manualmente después de COMMIT, antes de activar el frontend.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, public;

DO $verify$
BEGIN
  IF (SELECT count(*) FROM pg_class c
      WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass,
                      'product_registration_private.authorized_supervisors'::regclass)
        AND c.relrowsecurity) <> 3 THEN
    RAISE EXCEPTION 'RLS debe estar activo en perfiles, productos y supervisores autorizados';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.oid = to_regprocedure('public.register_product(jsonb)') AND p.prosecdef
      AND r.rolname = 'eagle_product_registrar' AND NOT r.rolcanlogin AND NOT r.rolbypassrls
  ) OR NOT has_function_privilege('authenticated', 'public.register_product(jsonb)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.register_product(jsonb)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.can_register_product()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.can_register_product()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Propietario o permisos de register_product inesperados';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated')) AS r(name)
    WHERE has_any_column_privilege(r.name, 'public.profiles', 'INSERT, UPDATE')
       OR has_any_column_privilege(r.name, 'public.products', 'INSERT, UPDATE')
       OR has_table_privilege(r.name, 'public.profiles', 'DELETE, TRUNCATE')
       OR has_table_privilege(r.name, 'public.products', 'DELETE, TRUNCATE')
       OR has_column_privilege(r.name, 'public.profiles', 'pinTerminal', 'SELECT')
       OR has_column_privilege(r.name, 'public.products', 'costPrice', 'SELECT')
       OR has_function_privilege(r.name, 'public.handle_new_user()', 'EXECUTE')
       OR pg_has_role(r.name, 'eagle_product_registrar', 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'Persiste un acceso directo fuera de la matriz';
  END IF;
  IF NOT has_function_privilege('eagle_product_registrar',
       'product_registration_private.session_uid()', 'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('authenticator')) AS r(name)
       WHERE has_schema_privilege(r.name, 'product_registration_private', 'USAGE')
          OR has_function_privilege(r.name, 'product_registration_private.session_uid()', 'EXECUTE')
          OR has_any_column_privilege(r.name, 'product_registration_private.authorized_supervisors',
                                      'SELECT, INSERT, UPDATE')
          OR has_table_privilege(r.name, 'product_registration_private.authorized_supervisors',
                                 'DELETE, TRUNCATE, TRIGGER')
          OR pg_has_role(r.name, 'eagle_product_registrar', 'MEMBER')
     ) THEN
    RAISE EXCEPTION 'Permisos inesperados en la identidad de sesión o la lista privada';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indexrelid = to_regclass('public.products_canonical_gtin_uidx')
      AND i.indrelid = 'public.products'::regclass AND i.indisunique AND i.indisvalid
  ) THEN
    RAISE EXCEPTION 'Falta el índice único GTIN válido';
  END IF;
END;
$verify$;

-- Conservar como expected_function_ddl del inverso.
SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure) AS expected_function_ddl;
SELECT 'Comprobaciones estructurales aprobadas; falta probar con sesiones reales' AS resultado;
ROLLBACK;
