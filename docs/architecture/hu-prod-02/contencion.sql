-- Procedimiento independiente. Requiere autorización y acceso administrativo.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
-- Deshabilitar Guardar antes de la contención. Conservar RLS, CLIENTE e índice GTIN.
-- Los permisos de tabla observados antes de la migración todavía son amplios.
-- Aplicar este cierre de RPC únicamente después de instalarla.
REVOKE ALL ON FUNCTION public.register_product(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_register_product() FROM PUBLIC, anon, authenticated;

DO $containment$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('authenticator')) AS r(name)
    WHERE has_function_privilege(r.name, 'public.register_product(jsonb)', 'EXECUTE')
       OR has_function_privilege(r.name, 'public.can_register_product()', 'EXECUTE')
       OR pg_has_role(r.name, 'eagle_product_registrar', 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'Persiste una ruta EXECUTE heredada; revisar los otorgantes';
  END IF;
END;
$containment$;

-- Salida de diagnóstico posterior: todos estos resultados deben ser false.
SELECT r.name AS api_role,
       has_any_column_privilege(r.name, 'public.products', 'INSERT, UPDATE') AS direct_product_write,
       has_table_privilege(r.name, 'public.products', 'DELETE, TRUNCATE') AS direct_product_delete,
       has_column_privilege(r.name, 'public.profiles', 'role', 'UPDATE') AS direct_role_update,
       has_column_privilege(r.name, 'public.profiles', 'pinTerminal', 'SELECT') AS pin_read,
       has_column_privilege(r.name, 'public.products', 'costPrice', 'SELECT') AS cost_read,
       has_function_privilege(r.name, 'public.handle_new_user()', 'EXECUTE') AS signup_trigger_execute
FROM (VALUES ('anon'), ('authenticated')) AS r(name);

COMMIT;

