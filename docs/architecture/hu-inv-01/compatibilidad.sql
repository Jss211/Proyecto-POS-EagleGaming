-- HU-INV-01. Comprobaciones pendientes tras el ensayo exitoso de ACL.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, public;

-- Deben existir la tabla y las columnas de Kardex; revisar nulabilidad, defaults
-- y posibles campos obligatorios adicionales. type debe admitir ENTRADA_COMPRA.
SELECT to_regclass('public.inventory_movements') AS kardex;
SELECT a.attname AS column_name, format_type(a.atttypid, a.atttypmod) AS data_type,
       a.attnotnull, a.attidentity, a.attgenerated,
       pg_get_expr(d.adbin, d.adrelid) AS default_expression,
       ARRAY(SELECT e.enumlabel FROM pg_enum e WHERE e.enumtypid = a.atttypid
             ORDER BY e.enumsortorder) AS enum_values
FROM pg_attribute a
LEFT JOIN pg_attrdef d ON (d.adrelid, d.adnum) = (a.attrelid, a.attnum)
WHERE a.attrelid = to_regclass('public.inventory_movements')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- Debe haber PK simple no diferible sobre id y FK validada de productId a products.id.
SELECT conname, contype, convalidated, condeferrable, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = to_regclass('public.inventory_movements')
ORDER BY conname;

-- Confirmar RLS y revisar si una política existente podría afectar a roles legítimos.
SELECT c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) AS owner
FROM pg_class c WHERE c.oid = to_regclass('public.inventory_movements');

-- La política abierta conocida se valida en entradas.sql. Mostrar solo otras.
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_movements'
  AND policyname <> 'Permitir movimientos de inventario a usuarios autenticados'
ORDER BY policyname;

-- Debe devolver cero triggers personalizados habilitados en ambas tablas.
SELECT t.tgrelid::regclass AS relation, t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
WHERE t.tgrelid IN (to_regclass('public.inventory_movements'), to_regclass('public.products'))
  AND NOT t.tgisinternal AND t.tgenabled <> 'D';

-- Candidatas preexistentes con acceso desde API que deben revisarse por separado.
SELECT p.oid::regprocedure AS function_name, p.prosecdef, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind = 'f' AND n.nspname IN ('public', 'graphql_public')
  AND (p.proname ~* 'inventor|stock|kardex' OR p.prosrc ~* 'inventory_movements')
  AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));

ROLLBACK;
