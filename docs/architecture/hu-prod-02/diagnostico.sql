BEGIN READ ONLY;

SET LOCAL search_path = pg_catalog, public;
SHOW server_version;
SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tablename, p.policyname) AS approved_policies
FROM pg_policies AS p
WHERE p.schemaname = 'public' AND p.tablename IN ('profiles', 'products');

-- Los grants efectivos no sustituyen este inventario ni identifican al otorgante.
SELECT jsonb_build_object(
  'tables', (SELECT jsonb_object_agg(c.relname, jsonb_build_object(
    'owner', pg_get_userbyid(c.relowner), 'acl', c.relacl,
    'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity))
    FROM pg_class c WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass)),
  'columns', (SELECT jsonb_object_agg(c.relname || '.' || a.attname, to_jsonb(a.attacl))
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass)
      AND a.attnum > 0 AND NOT a.attisdropped),
  'handle_new_user', (SELECT to_jsonb(p.proacl) FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.handle_new_user()'))
) AS acl_inventory;

-- Incluye permisos implícitos cuando proacl es NULL.
SELECT pg_get_userbyid(a.grantor) AS grantor,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
       a.privilege_type, a.is_grantable
FROM pg_proc p
CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
WHERE p.oid = to_regprocedure('public.handle_new_user()');

SELECT defaclrole::regrole AS owner, defaclnamespace::regnamespace AS schema,
       defaclobjtype, defaclacl
FROM pg_default_acl
WHERE defaclnamespace = 0 OR defaclnamespace = 'public'::regnamespace;

-- Insumos del inverso. Exportar el resultado completo antes del despliegue.
-- restore_original cubre los grants que la migración revoca directamente.
-- Revisar otorgantes y dependencias antes de usarlo con la sesión postgres.
WITH original_policies AS (
  SELECT p.*, format(
    'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
    p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd,
    (SELECT string_agg(CASE WHEN role_name = 'public' THEN 'PUBLIC'
      ELSE quote_ident(role_name::text) END, ', ' ORDER BY role_name)
     FROM unnest(p.roles) AS r(role_name)),
    CASE WHEN p.qual IS NULL THEN '' ELSE format(' USING (%s)', p.qual) END,
    CASE WHEN p.with_check IS NULL THEN '' ELSE format(' WITH CHECK (%s)', p.with_check) END
  ) AS ddl
  FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.tablename IN ('profiles', 'products')
), removed_grants AS (
  SELECT 'TABLE public.' || quote_ident(c.relname) AS target, a.*
  FROM pg_class c
  CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass)
  UNION ALL
  SELECT 'FUNCTION public.handle_new_user()', a.*
  FROM pg_proc p
  CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  WHERE p.oid = to_regprocedure('public.handle_new_user()')
), browser_grants AS (
  SELECT *,
    CASE WHEN grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(grantee)) END AS recipient
  FROM removed_grants
  WHERE grantee = 0 OR grantee IN ('anon'::regrole, 'authenticated'::regrole)
)
SELECT current_user AS execution_role,
       coalesce((
         SELECT pg_get_expr(d.adbin, d.adrelid)
         FROM pg_attrdef d JOIN pg_attribute a ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
         WHERE d.adrelid = 'public.profiles'::regclass AND a.attname = 'role'
       ), '') AS original_role_default,
       ARRAY(SELECT ddl FROM original_policies ORDER BY tablename, policyname)
       || ARRAY(
         SELECT format('GRANT %s ON %s TO %s%s', privilege_type, target, recipient,
                       CASE WHEN is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
         FROM browser_grants ORDER BY target, recipient, privilege_type
       ) AS restore_original,
       NOT EXISTS (
         SELECT 1 FROM browser_grants WHERE grantor <> 'postgres'::regrole
       ) AS restore_grantors_match_postgres;

-- Confirmado: tablas de postgres, RLS habilitado sin FORCE, sin ACL de
-- columna; permisos de tabla amplios y EXECUTE abierto en el trigger.
-- Falta el detalle por operación y otorgante para generar el inverso.
SELECT c.oid::regclass AS relation, pg_get_userbyid(a.grantor) AS grantor,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC'
            ELSE pg_get_userbyid(a.grantee) END AS grantee,
       a.privilege_type, a.is_grantable
FROM pg_class c
CROSS JOIN LATERAL aclexplode(c.relacl) a
WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass)
ORDER BY relation, grantee, privilege_type;

-- Confirmado el cuerpo de aprovisionamiento y que products no tiene triggers
-- personalizados. Capturar el DDL canónico exacto y revisar triggers de profiles.
SELECT t.tgname, t.tgenabled, t.tgrelid::regclass AS relation,
       pg_get_triggerdef(t.oid) AS trigger_ddl,
       pg_get_functiondef(t.tgfoid) AS function_ddl
FROM pg_trigger t
WHERE NOT t.tgisinternal
  AND (t.tgrelid = 'public.profiles'::regclass
       OR t.tgfoid = to_regprocedure('public.handle_new_user()'));

-- Completar solo los campos cuyo contrato todavía no fue suministrado.
SELECT a.attrelid::regclass AS relation, a.attname,
       format_type(a.atttypid, a.atttypmod) AS data_type, a.attnotnull,
       a.attidentity, a.attgenerated,
       pg_get_expr(d.adbin, d.adrelid) AS default_expr
FROM pg_attribute a
LEFT JOIN pg_attrdef d ON (d.adrelid, d.adnum) = (a.attrelid, a.attnum)
WHERE (a.attrelid = 'public.products'::regclass AND a.attname IN ('name', 'description'))
   OR (a.attrelid = 'public.profiles'::regclass AND a.attname IN ('id', 'role'));

SELECT base.rolname, reachable.rolname AS reachable_role,
       pg_has_role(base.oid, reachable.oid, 'USAGE') AS immediately_available,
       reachable.rolsuper, reachable.rolbypassrls
FROM pg_roles AS base CROSS JOIN pg_roles AS reachable
WHERE base.rolname IN ('anon', 'authenticated', 'authenticator')
  AND pg_has_role(base.oid, reachable.oid, 'MEMBER');

SELECT r.name, a.attrelid::regclass AS relation, a.attname, op.name AS operation,
       has_column_privilege(r.name, a.attrelid, a.attnum, op.name) AS allowed
FROM (VALUES ('anon'), ('authenticated')) AS r(name)
CROSS JOIN pg_attribute AS a
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) AS op(name)
WHERE a.attrelid IN ('public.profiles'::regclass, 'public.products'::regclass)
  AND a.attnum > 0 AND NOT a.attisdropped;

SELECT r.name, c.oid::regclass AS relation, op.name AS operation,
       has_table_privilege(r.name, c.oid, op.name) AS allowed
FROM (VALUES ('anon'), ('authenticated')) AS r(name)
CROSS JOIN pg_class AS c
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                   ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS op(name)
WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass);

-- Esquemas expuestos confirmados: public y graphql_public.
-- pg_views no incluye las vistas materializadas (relkind = 'm').
WITH RECURSIVE dependent_relations(oid) AS (
  VALUES ('public.profiles'::regclass::oid), ('public.products'::regclass::oid)
  UNION
  SELECT rewrite.ev_class
  FROM dependent_relations AS parent
  JOIN pg_depend AS dependency ON dependency.refobjid = parent.oid
    AND dependency.refclassid = 'pg_class'::regclass
    AND dependency.classid = 'pg_rewrite'::regclass
  JOIN pg_rewrite AS rewrite ON rewrite.oid = dependency.objid
)
SELECT c.oid::regclass, c.relkind, c.reloptions,
       pg_get_userbyid(c.relowner) AS owner, pg_get_viewdef(c.oid, true),
       has_any_column_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE') AS anon_columns,
       has_any_column_privilege('authenticated', c.oid, 'SELECT, INSERT, UPDATE') AS authenticated_columns,
       has_table_privilege('anon', c.oid, 'DELETE') AS anon_delete,
       has_table_privilege('authenticated', c.oid, 'DELETE') AS authenticated_delete,
       EXISTS (SELECT 1 FROM dependent_relations d WHERE d.oid = c.oid) AS depends_on_protected_table
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'graphql_public') AND c.relkind = 'm';

-- Revisar la envoltura expuesta y el resolvedor interno que utiliza.
-- handle_new_user retorna trigger y la migración revoca EXECUTE a la API.
SELECT p.oid::regprocedure AS function_name, p.prosecdef AS security_definer,
       p.prorettype::regtype AS return_type,
       pg_get_userbyid(p.proowner) AS owner, e.extname AS extension_name,
       p.proacl, p.proconfig, pg_get_functiondef(p.oid),
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
LEFT JOIN pg_depend AS d ON d.classid = 'pg_proc'::regclass AND d.objid = p.oid
  AND d.refclassid = 'pg_extension'::regclass AND d.deptype = 'e'
LEFT JOIN pg_extension AS e ON e.oid = d.refobjid
WHERE p.prokind = 'f'
  AND ((n.nspname = 'graphql_public' AND p.proname = 'graphql')
       OR (n.nspname = 'graphql' AND p.proname = 'resolve'))
ORDER BY function_name;

-- Sin colisiones UPC-A/EAN-13 en el diagnóstico suministrado.
-- Revisar si algún código interno válido se clasificaría como GTIN.
WITH candidates AS MATERIALIZED (
  SELECT id, barcode, length(barcode) AS n
  FROM public.products WHERE barcode COLLATE "C" ~ '^[0-9]{12,13}$'
)
SELECT c.id, c.barcode
FROM candidates c
WHERE (SELECT (10 - sum(substr(c.barcode, i, 1)::int *
       CASE WHEN (c.n - i) % 2 = 1 THEN 3 ELSE 1 END) % 10) % 10
       FROM generate_series(1, c.n - 1) AS s(i)) = right(c.barcode, 1)::int;

-- La restricción nueva requiere que no existan activos incompatibles.
SELECT id
FROM public.products
WHERE "isActive" IS TRUE AND (
  name ~ '[^[:space:]]' AND barcode ~ '^[^[:space:]]{1,128}$'
  AND category ~ '[^[:space:]]'
  AND price::text ~ '^[0-9]+(\.[0-9]+)?$'
  AND "costPrice"::text ~ '^[0-9]+(\.[0-9]+)?$' AND stock >= 0
) IS NOT TRUE;

ROLLBACK;

