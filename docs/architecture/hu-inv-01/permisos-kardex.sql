-- HU-INV-01. Ensayo aislado de ACL; no instala la RPC ni modifica filas.
-- No sustituir ROLLBACK por COMMIT. La incorporación a entradas.sql es posterior
-- a confirmar los metadatos y el origen de los permisos con diagnostico.sql.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, public;

LOCK TABLE public.inventory_movements IN ACCESS EXCLUSIVE MODE;

DO $permissions$
DECLARE
  columns text;
  before_internal jsonb;
  after_internal jsonb;
  failures jsonb;
  internal_acl_query constant text := $acl$
    WITH roles AS (
      SELECT oid, rolname::text AS name FROM pg_roles
      WHERE rolname IN ('postgres', 'service_role', 'authenticator') OR left(rolname::text, 9) = 'supabase_'
    ), permissions AS (
      SELECT r.name AS role_name, 'table' AS scope, NULL::text AS column_name, p.name AS privilege
      FROM roles r
      CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) p(name)
      WHERE has_table_privilege(r.oid, 'public.inventory_movements', p.name)
      UNION ALL
      SELECT r.name, 'column', a.attname::text, p.name
      FROM roles r CROSS JOIN pg_attribute a
      CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) p(name)
      WHERE a.attrelid = 'public.inventory_movements'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
        AND has_column_privilege(r.oid, a.attrelid, a.attnum, p.name)
    )
    SELECT coalesce(jsonb_agg(to_jsonb(permissions) ORDER BY role_name, scope, column_name, privilege), '[]'::jsonb)
    FROM permissions
  $acl$;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Ejecuta el ensayo como postgres';
  END IF;

  EXECUTE internal_acl_query INTO before_internal;

  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO columns
  FROM pg_attribute
  WHERE attrelid = 'public.inventory_movements'::regclass
    AND attnum > 0 AND NOT attisdropped;

  IF columns IS NULL THEN
    RAISE EXCEPTION 'No se encontraron columnas del Kardex';
  END IF;

  EXECUTE format(
    'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s)
     ON TABLE public.inventory_movements FROM PUBLIC, anon, authenticated RESTRICT', columns
  );

  REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
    ON TABLE public.inventory_movements FROM PUBLIC, anon, authenticated RESTRICT;

  ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

  EXECUTE internal_acl_query INTO after_internal;
  IF after_internal IS DISTINCT FROM before_internal THEN
    RAISE EXCEPTION 'La revocación cambia privilegios efectivos de roles internos'
      USING DETAIL = 'Revisa grants internos que dependían de PUBLIC o de roles de la API.';
  END IF;

  WITH roles AS (
    SELECT oid, rolname::text AS name FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  ), remaining AS (
    SELECT r.name AS api_role, 'public.inventory_movements' AS relation,
           NULL::text AS column_name, p.name AS privilege
    FROM roles r
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('TRIGGER'), ('REFERENCES')) p(name)
    WHERE has_table_privilege(r.oid, 'public.inventory_movements', p.name)
    UNION ALL
    SELECT r.name, a.attrelid::regclass::text, a.attname::text, p.name
    FROM roles r CROSS JOIN pg_attribute a
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) p(name)
    WHERE a.attnum > 0 AND NOT a.attisdropped
      AND (a.attrelid = 'public.inventory_movements'::regclass
           OR (a.attrelid = 'public.products'::regclass AND p.name = 'UPDATE'))
      AND has_column_privilege(r.oid, a.attrelid, a.attnum, p.name)
    UNION ALL
    SELECT api.name, 'public.inventory_movements', NULL::text,
           'membresía: ' || elevated.rolname
    FROM roles api CROSS JOIN pg_roles elevated
    JOIN pg_class c ON c.oid = 'public.inventory_movements'::regclass
    WHERE (elevated.rolsuper OR elevated.rolbypassrls OR elevated.oid = c.relowner)
      AND pg_has_role(api.oid, elevated.oid, 'MEMBER')
  )
  SELECT jsonb_agg(to_jsonb(remaining) ORDER BY api_role, relation, column_name, privilege)
  INTO failures FROM remaining;

  IF failures IS NOT NULL THEN
    RAISE EXCEPTION 'Persisten permisos efectivos sobre Kardex o stock'
      USING DETAIL = jsonb_pretty(failures);
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.inventory_movements'::regclass) THEN
    RAISE EXCEPTION 'RLS no está habilitado en el Kardex';
  END IF;
END;
$permissions$;

SELECT 'Ensayo correcto: Kardex cerrado a la API y roles internos sin cambios de ACL efectivos' AS resultado;

ROLLBACK;
