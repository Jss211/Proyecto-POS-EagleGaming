-- HU-INV-01. Solo metadatos. No devuelve productos ni movimientos.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, public;

SELECT to_regclass('public.inventory_movements') AS kardex,
       to_regclass('public.products') AS products;

SELECT c.oid::regclass AS relation, pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity, c.relforcerowsecurity, c.relacl
FROM pg_class c
WHERE c.oid IN (to_regclass('public.inventory_movements'), to_regclass('public.products'));

SELECT a.attrelid::regclass AS relation, a.attname,
       format_type(a.atttypid, a.atttypmod) AS type,
       a.attnotnull, a.attidentity, a.attgenerated, a.attacl,
       pg_get_expr(d.adbin, d.adrelid) AS default_expression,
       ARRAY(SELECT e.enumlabel FROM pg_enum e WHERE e.enumtypid = a.atttypid ORDER BY e.enumsortorder) AS enum_values
FROM pg_attribute a LEFT JOIN pg_attrdef d ON (d.adrelid, d.adnum) = (a.attrelid, a.attnum)
WHERE a.attrelid IN (to_regclass('public.inventory_movements'), to_regclass('public.products'))
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY relation, a.attnum;

SELECT conrelid::regclass AS relation, conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (to_regclass('public.inventory_movements'), to_regclass('public.products'));

SELECT tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('inventory_movements', 'products');

SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('inventory_movements', 'products');

SELECT t.tgrelid::regclass AS relation, t.tgenabled, pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t WHERE NOT t.tgisinternal
  AND t.tgrelid IN (to_regclass('public.inventory_movements'), to_regclass('public.products'));

SELECT r.name, c.oid::regclass AS relation, permission.name AS privilege,
       has_table_privilege(r.name, c.oid, permission.name) AS table_grant,
       CASE WHEN permission.name IN ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
         THEN has_any_column_privilege(r.name, c.oid, permission.name) END AS any_column_grant
FROM (VALUES ('anon'), ('authenticated'), ('authenticator')) r(name)
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) permission(name)
CROSS JOIN pg_class c
WHERE c.oid IN (to_regclass('public.inventory_movements'), to_regclass('public.products'));

-- Origen de los permisos efectivos del Kardex. 0 representa PUBLIC.
WITH kardex AS (
  SELECT oid, relowner, relacl FROM pg_class
  WHERE oid = to_regclass('public.inventory_movements')
), grants AS (
  SELECT 'tabla' AS scope, NULL::text AS column_name, g.*
  FROM kardex k CROSS JOIN LATERAL aclexplode(coalesce(k.relacl, acldefault('r', k.relowner))) g
  UNION ALL
  SELECT 'columna', a.attname::text, g.*
  FROM kardex k JOIN pg_attribute a ON a.attrelid = k.oid
  CROSS JOIN LATERAL aclexplode(a.attacl) g
  WHERE a.attnum > 0 AND NOT a.attisdropped
)
SELECT r.rolname AS api_role, g.scope, g.column_name, g.privilege_type,
       CASE WHEN g.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(g.grantee) END AS grantee,
       pg_get_userbyid(g.grantor) AS grantor, g.is_grantable,
       CASE WHEN g.grantee = 0 THEN 'PUBLIC'
            WHEN g.grantee = r.oid THEN 'directo'
            WHEN pg_has_role(r.oid, g.grantee, 'USAGE') THEN 'heredado'
            ELSE 'membresía sin herencia inmediata'
       END AS source
FROM grants g CROSS JOIN pg_roles r
WHERE r.rolname IN ('anon', 'authenticated')
  AND CASE WHEN g.grantee = 0 THEN true ELSE pg_has_role(r.oid, g.grantee, 'MEMBER') END
ORDER BY api_role, scope, column_name, privilege_type, grantee;

SELECT api.rolname AS api_role, r.rolname AS reachable_role,
       pg_has_role(api.oid, r.oid, 'USAGE') AS inherited,
       r.rolsuper, r.rolbypassrls,
       r.oid = c.relowner AS owns_kardex
FROM pg_roles api
CROSS JOIN pg_roles r
JOIN pg_class c ON c.oid = to_regclass('public.inventory_movements')
WHERE api.rolname IN ('anon', 'authenticated')
  AND api.oid <> r.oid AND pg_has_role(api.oid, r.oid, 'MEMBER')
ORDER BY api_role, reachable_role;

-- Vistas directas e indirectas del Kardex en los esquemas expuestos conocidos.
WITH RECURSIVE dependent_relations(oid) AS (
  SELECT to_regclass('public.inventory_movements')::oid
  UNION
  SELECT rw.ev_class
  FROM dependent_relations parent
  JOIN pg_depend d ON d.refobjid = parent.oid
    AND d.refclassid = 'pg_class'::regclass AND d.classid = 'pg_rewrite'::regclass
  JOIN pg_rewrite rw ON rw.oid = d.objid
)
SELECT c.oid::regclass AS relation, c.relkind, c.reloptions, r.name AS api_role,
       has_any_column_privilege(r.name, c.oid, 'SELECT, INSERT, UPDATE') AS column_access,
       has_table_privilege(r.name, c.oid, 'DELETE') AS can_delete,
       pg_get_viewdef(c.oid, true) AS definition
FROM dependent_relations d JOIN pg_class c ON c.oid = d.oid
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN (VALUES ('anon'), ('authenticated')) r(name)
WHERE n.nspname IN ('public', 'graphql_public') AND c.relkind IN ('v', 'm');

-- Identificar funciones de Kardex ya instaladas y rutas que merecen revisión.
SELECT p.oid::regprocedure AS function_name, p.prosecdef, pg_get_userbyid(p.proowner) AS owner,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind = 'f' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND (p.proname ~* 'inventor|stock|kardex' OR p.prosrc ~* 'inventory_movements');

ROLLBACK;
