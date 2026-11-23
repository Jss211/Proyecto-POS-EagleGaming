-- Ejecutar manualmente en SQL Editor de sistema-POS-EagleGaming como postgres.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, public;

LOCK TABLE public.profiles, public.products IN ACCESS EXCLUSIVE MODE;

DO $migration$
DECLARE
  fn regprocedure := to_regprocedure('public.handle_new_user()');
  original_body constant text := $body$
BEGIN
  INSERT INTO public.profiles (
    id, email, "fullName", "avatarUrl", role, "createdAt", "updatedAt"
  )
  VALUES (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'CAJERO'::"Role",
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$body$;
  item record;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Usa la sesión administrativa postgres del proyecto correcto';
  END IF;

  IF (
    SELECT array_agg(p.tablename::text || '.' || p.cmd || '.' || p.policyname
                     ORDER BY p.tablename, p.cmd, p.policyname)
    FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('profiles', 'products')
  ) IS DISTINCT FROM ARRAY[
    'products.ALL.Permitir gestion de productos a usuarios autenticados',
    'products.SELECT.Permitir lectura de productos a usuarios autenticados',
    'profiles.SELECT.Permitir lectura de perfiles a usuarios autenticados',
    'profiles.UPDATE.Permitir actualizar su propio perfil'
  ] OR EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('profiles', 'products')
      AND (
        p.roles IS DISTINCT FROM ARRAY['authenticated']::name[]
        OR CASE WHEN p.cmd = 'UPDATE' THEN
          regexp_replace(coalesce(p.qual, ''), '[[:space:]()]', '', 'g') NOT IN
            ('auth.uid::text=id', 'auth.uid::text=id::text', 'id=auth.uid::text', 'id::text=auth.uid::text')
          OR (p.with_check IS NOT NULL AND p.with_check IS DISTINCT FROM p.qual)
        ELSE
          regexp_replace(coalesce(p.qual, ''), '[[:space:]()]', '', 'g') <> 'true'
          OR (p.with_check IS NOT NULL AND
              regexp_replace(p.with_check, '[[:space:]()]', '', 'g') <> 'true')
        END
      )
  ) THEN
    RAISE EXCEPTION 'Cambió el inventario confirmado de las cuatro políticas';
  END IF;

  IF fn IS NULL OR NOT EXISTS (
       SELECT 1 FROM pg_proc p WHERE p.oid = fn
         AND pg_get_userbyid(p.proowner) = 'postgres'
         AND p.prosecdef AND p.proconfig IS NULL
         AND p.prorettype = 'trigger'::regtype
         AND regexp_replace(lower(p.prosrc), '[[:space:]]+', '', 'g') =
             regexp_replace(lower(original_body), '[[:space:]]+', '', 'g')
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'auth.users'::regclass
         AND t.tgname = 'on_auth_user_created' AND t.tgfoid = fn
         AND t.tgenabled IN ('O', 'A') AND t.tgtype = 5
         AND t.tgqual IS NULL
     ) THEN
    RAISE EXCEPTION 'El cuerpo o el enlace del trigger de registro difiere de lo confirmado';
  END IF;

  IF (SELECT count(*) FROM pg_class c
      WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass)
        AND pg_get_userbyid(c.relowner) = 'postgres'
        AND c.relrowsecurity AND NOT c.relforcerowsecurity) <> 2
     OR EXISTS (
       SELECT 1 FROM pg_attribute a
       WHERE a.attrelid IN ('public.profiles'::regclass, 'public.products'::regclass)
         AND a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Cambió la titularidad, el estado RLS o el ACL de columna confirmado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.products'::regclass AND NOT t.tgisinternal
  ) OR EXISTS (
    SELECT 1 FROM (VALUES
      ('id', 'text', true), ('barcode', 'text', true), ('sku', 'text', false),
      ('name', 'text', NULL), ('description', 'text', NULL),
      ('price', 'numeric(10,2)', NULL), ('costPrice', 'numeric(10,2)', NULL),
      ('stock', 'integer', true), ('minStock', 'integer', true),
      ('category', 'text', true), ('isActive', 'boolean', true),
      ('createdAt', 'timestamp(3) without time zone', true),
      ('updatedAt', 'timestamp(3) without time zone', true)
    ) AS expected(column_name, column_type, required)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_attribute a WHERE a.attrelid = 'public.products'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped AND a.attname = expected.column_name
        AND format_type(a.atttypid, a.atttypmod) = expected.column_type
        AND (expected.required IS NULL OR a.attnotnull = expected.required)
    )
  ) OR EXISTS (
    -- La RPC fija stock, categoría, estado y fechas de forma explícita.
    SELECT 1 FROM (VALUES
      ('id', NULL), ('updatedAt', NULL), ('minStock', '5')
    ) AS expected(column_name, default_expr)
    JOIN pg_attribute a ON a.attrelid = 'public.products'::regclass
      AND a.attname = expected.column_name AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON (d.adrelid, d.adnum) = (a.attrelid, a.attnum)
    WHERE pg_get_expr(d.adbin, d.adrelid) IS DISTINCT FROM expected.default_expr
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.products'::regclass
      AND c.conname = 'products_pkey' AND c.contype = 'p' AND c.convalidated
  ) OR EXISTS (
    SELECT 1 FROM (VALUES ('id'), ('barcode'), ('sku')) AS expected(column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
      WHERE i.indrelid = 'public.products'::regclass AND a.attname = expected.column_name
        AND i.indisunique AND i.indisvalid AND i.indisready
        AND i.indnkeyatts = 1 AND i.indexprs IS NULL AND i.indpred IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'El contrato confirmado de products cambió';
  END IF;

  FOR item IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('profiles', 'products')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', item.policyname, item.schemaname, item.tablename);
  END LOOP;

  FOR item IN
    SELECT c.relname, string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum) AS columns
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    WHERE a.attrelid IN ('public.profiles'::regclass, 'public.products'::regclass)
      AND a.attnum > 0 AND NOT a.attisdropped
    GROUP BY c.relname
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      item.columns, item.relname
    );
  END LOOP;
END;
$migration$;

-- El destino de role determina el enum sin depender de su esquema.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, email, "fullName", "avatarUrl", role, "createdAt", "updatedAt"
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'CLIENTE',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'CLIENTE';
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles, public.products FROM PUBLIC, anon, authenticated;

DO $acl$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES ('anon'), ('authenticated')) AS b(name)
    CROSS JOIN pg_class c
    WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass)
      AND (pg_has_role(b.name, c.relowner, 'MEMBER')
        OR has_table_privilege(b.name, c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
        OR has_any_column_privilege(b.name, c.oid, 'SELECT, INSERT, UPDATE, REFERENCES'))
  ) OR EXISTS (
    SELECT 1 FROM pg_roles r WHERE (r.rolsuper OR r.rolbypassrls)
      AND (pg_has_role('anon', r.oid, 'MEMBER') OR pg_has_role('authenticated', r.oid, 'MEMBER'))
  ) OR has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Persisten privilegios efectivos fuera del alcance aprobado';
  END IF;
END;
$acl$;

GRANT SELECT (id, email, "fullName", role, "avatarUrl") ON public.profiles TO authenticated;
CREATE POLICY eagle_profiles_own ON public.profiles FOR SELECT TO authenticated
  USING (id::text = (SELECT auth.uid())::text);

GRANT SELECT (id, barcode, sku, name, description, category, price, stock,
              "minStock", "isActive", "createdAt", "updatedAt")
  ON public.products TO authenticated;
CREATE POLICY eagle_products_read ON public.products FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (SELECT auth.uid())::text
      AND (p.role IN ('ADMIN', 'SUPERVISOR') OR (p.role = 'CAJERO' AND products."isActive" IS TRUE))
  ));

CREATE ROLE eagle_product_registrar NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION;
-- La cuenta de migración necesita CREATEROLE y poder transferir la propiedad.
GRANT eagle_product_registrar TO CURRENT_USER;

CREATE SCHEMA product_registration_private;
REVOKE ALL ON SCHEMA product_registration_private FROM PUBLIC, anon, authenticated;
CREATE TABLE product_registration_private.authorized_supervisors (user_id uuid PRIMARY KEY);
ALTER TABLE product_registration_private.authorized_supervisors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE product_registration_private.authorized_supervisors FROM PUBLIC, anon, authenticated;

-- El propietario postgres resuelve auth.uid() sin conceder USAGE sobre auth
-- al rol técnico. La función no acepta argumentos ni accede a tablas.
CREATE FUNCTION product_registration_private.session_uid()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT auth.uid();
$$;
REVOKE ALL ON FUNCTION product_registration_private.session_uid() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION product_registration_private.canonical_gtin(code text)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  n integer := length(code);
  total integer := 0;
BEGIN
  IF code COLLATE "C" !~ '^[0-9]{12,13}$' THEN RETURN NULL; END IF;
  FOR i IN 1..(n - 1) LOOP
    total := total + substr(code, i, 1)::integer * CASE WHEN (n - i) % 2 = 1 THEN 3 ELSE 1 END;
  END LOOP;
  IF (10 - total % 10) % 10 <> right(code, 1)::integer THEN RETURN NULL; END IF;
  RETURN lpad(code, 14, '0');
END;
$$;
REVOKE ALL ON FUNCTION product_registration_private.canonical_gtin(text) FROM PUBLIC, anon, authenticated;

CREATE UNIQUE INDEX products_canonical_gtin_uidx ON public.products
  (product_registration_private.canonical_gtin(barcode))
  WHERE product_registration_private.canonical_gtin(barcode) IS NOT NULL;

ALTER TABLE public.products ADD CONSTRAINT eagle_products_active_complete CHECK (
  "isActive" IS NOT TRUE OR (
    name ~ '[^[:space:]]' AND barcode ~ '^[^[:space:]]{1,128}$'
    AND category ~ '[^[:space:]]'
    AND price::text ~ '^[0-9]+(\.[0-9]+)?$'
    AND "costPrice"::text ~ '^[0-9]+(\.[0-9]+)?$'
    AND stock >= 0
  ) IS TRUE
);

GRANT USAGE ON SCHEMA public, product_registration_private TO eagle_product_registrar;
GRANT EXECUTE ON FUNCTION product_registration_private.session_uid(),
  product_registration_private.canonical_gtin(text) TO eagle_product_registrar;
GRANT SELECT (user_id) ON product_registration_private.authorized_supervisors TO eagle_product_registrar;
CREATE POLICY eagle_registrar_supervisor_self ON product_registration_private.authorized_supervisors
  FOR SELECT TO eagle_product_registrar
  USING (user_id = (SELECT product_registration_private.session_uid()));
GRANT SELECT (id, role) ON public.profiles TO eagle_product_registrar;
GRANT INSERT (id, barcode, sku, name, category, description, price, "costPrice",
              stock, "isActive", "createdAt", "updatedAt"),
      SELECT (id) ON public.products TO eagle_product_registrar;

CREATE POLICY eagle_registrar_profiles_read ON public.profiles
  FOR SELECT TO eagle_product_registrar
  USING (id::text = (SELECT product_registration_private.session_uid())::text);
CREATE POLICY eagle_registrar_return_id ON public.products
  FOR SELECT TO eagle_product_registrar USING (true);
CREATE POLICY eagle_registrar_insert ON public.products
  FOR INSERT TO eagle_product_registrar WITH CHECK (stock = 0 AND "isActive" IS FALSE);

-- Devuelve solo la capacidad efectiva de la sesión actual.
CREATE FUNCTION public.can_register_product()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (SELECT product_registration_private.session_uid())::text
    AND (p.role = 'ADMIN' OR (p.role = 'SUPERVISOR' AND EXISTS (
      SELECT 1 FROM product_registration_private.authorized_supervisors s
      WHERE s.user_id = (SELECT product_registration_private.session_uid())
    )))
  );
$$;

CREATE FUNCTION public.register_product(p_product jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp SET timezone = 'UTC' AS $$
DECLARE
  product_id public.products.id%TYPE;
  ts timestamptz := statement_timestamp();
  barcode_value text;
  sku_value text;
  kind text;
  gtin text;
BEGIN
  IF NOT public.can_register_product() THEN
    RAISE EXCEPTION 'Registro no autorizado' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_product) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Solicitud inválida' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_product) AS k(key)
    WHERE k.key NOT IN ('name','barcode','barcodeKind','sku','category','price','costPrice','description')
  ) OR EXISTS (
    SELECT 1 FROM unnest(ARRAY['name','barcode','barcodeKind','category','price','costPrice']) AS k(key)
    WHERE jsonb_typeof(p_product -> k.key) IS DISTINCT FROM 'string'
  ) OR EXISTS (
    SELECT 1 FROM unnest(ARRAY['sku','description']) AS k(key)
    WHERE p_product ? k.key AND jsonb_typeof(p_product -> k.key) NOT IN ('null','string')
  ) THEN
    RAISE EXCEPTION 'Campos de registro inválidos' USING ERRCODE = '22023';
  END IF;

  barcode_value := p_product ->> 'barcode';
  sku_value := nullif(p_product ->> 'sku', '');
  kind := p_product ->> 'barcodeKind';
  gtin := product_registration_private.canonical_gtin(barcode_value);
  IF (p_product ->> 'name') !~ '[^[:space:]]'
     OR (p_product ->> 'category') !~ '[^[:space:]]'
     OR barcode_value !~ '^[^[:space:]]{1,128}$'
     OR (sku_value IS NOT NULL AND sku_value !~ '^[^[:space:]]{1,128}$')
     OR kind NOT IN ('gtin','internal')
     OR (kind = 'gtin' AND gtin IS NULL)
     OR (kind = 'internal' AND gtin IS NOT NULL)
     OR (p_product ->> 'price') COLLATE "C" !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$'
     OR (p_product ->> 'costPrice') COLLATE "C" !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$' THEN
    RAISE EXCEPTION 'Datos de producto inválidos' USING ERRCODE = '22023';
  END IF;

  -- id es text y updatedAt no tiene default en el esquema confirmado.
  product_id := gen_random_uuid()::text;
  INSERT INTO public.products (id, barcode, sku, name, category, description, price, "costPrice",
                               stock, "isActive", "createdAt", "updatedAt")
  VALUES (product_id, barcode_value, sku_value, btrim(p_product ->> 'name'),
          btrim(p_product ->> 'category'), nullif(btrim(p_product ->> 'description'), ''),
          (p_product ->> 'price')::numeric, (p_product ->> 'costPrice')::numeric, 0, false, ts, ts)
  RETURNING id INTO product_id;
  RETURN jsonb_build_object('id', product_id::text);
END;
$$;

REVOKE ALL ON FUNCTION public.register_product(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_register_product() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_product(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_register_product() TO authenticated;
GRANT CREATE ON SCHEMA public TO eagle_product_registrar;
ALTER FUNCTION public.register_product(jsonb) OWNER TO eagle_product_registrar;
ALTER FUNCTION public.can_register_product() OWNER TO eagle_product_registrar;
REVOKE CREATE ON SCHEMA public FROM eagle_product_registrar;
REVOKE eagle_product_registrar FROM CURRENT_USER;

-- Diagnóstico del ensayo: evaluar antes de COMMIT y emitir solo los fallos.
-- DETAIL sobrevive a la reversión y no incluye datos de productos o perfiles.
DO $verify$
DECLARE
  failures jsonb;
BEGIN
  WITH RECURSIVE api_roles AS (
    SELECT oid, rolname::text AS role_name FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated', 'authenticator')
  ), browser_roles AS (
    SELECT * FROM api_roles WHERE role_name IN ('anon', 'authenticated')
  ), memberships AS (
    SELECT r.oid AS origin, r.oid AS current_role_id, ARRAY[r.oid] AS path
    FROM api_roles r
    UNION ALL
    SELECT m.origin, g.roleid, m.path || g.roleid
    FROM memberships m JOIN pg_auth_members g ON g.member = m.current_role_id
    WHERE NOT g.roleid = ANY(m.path)
  ), rpc_checks AS (
    SELECT r.oid AS role_id, r.role_name, 'function' AS object_type,
           to_regprocedure(f.signature)::oid AS object_id,
           f.signature AS object_name, NULL::text AS column_name, 'EXECUTE' AS privilege,
           NOT f.is_private AND r.role_name = 'authenticated' AS expected,
           has_function_privilege(r.oid, f.signature, 'EXECUTE') AS actual
    FROM browser_roles r CROSS JOIN (VALUES
      ('public.register_product(jsonb)', false), ('public.can_register_product()', false),
      ('public.handle_new_user()', true)
    ) AS f(signature, is_private)
  ), membership_checks AS (
    SELECT r.oid, r.role_name, 'membership', 'eagle_product_registrar'::regrole::oid,
           'eagle_product_registrar', NULL::text, 'MEMBER', false,
           pg_has_role(r.oid, 'eagle_product_registrar', 'MEMBER')
    FROM api_roles r
  ), schema_checks AS (
    SELECT r.oid, r.role_name, 'schema', 'product_registration_private'::regnamespace::oid,
           'product_registration_private', NULL::text, 'USAGE', false,
           has_schema_privilege(r.oid, 'product_registration_private', 'USAGE')
    FROM api_roles r
  ), session_helper_checks AS (
    SELECT r.oid, r.role_name, 'function',
           'product_registration_private.session_uid()'::regprocedure::oid,
           'product_registration_private.session_uid()', NULL::text, 'EXECUTE', false,
           has_function_privilege(r.oid, 'product_registration_private.session_uid()', 'EXECUTE')
    FROM api_roles r
  ), protected_columns AS (
    SELECT r.oid, r.role_name, 'column', a.attrelid,
           t.relation, a.attname::text, op.privilege, false,
           has_column_privilege(r.oid, a.attrelid, a.attnum, op.privilege)
    FROM api_roles r
    CROSS JOIN (VALUES
      ('public.profiles', 'pinTerminal'), ('public.products', 'costPrice'),
      ('product_registration_private.authorized_supervisors', 'user_id')
    ) AS t(relation, sensitive_column)
    JOIN pg_attribute a ON a.attrelid = t.relation::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE')) AS op(privilege)
    WHERE (t.relation = 'product_registration_private.authorized_supervisors'
           OR r.role_name IN ('anon', 'authenticated'))
      AND (op.privilege <> 'SELECT' OR a.attname = t.sensitive_column)
  ), protected_tables AS (
    SELECT r.oid, r.role_name, 'table', t.relation::regclass::oid,
           t.relation, NULL::text, op.privilege, false,
           has_table_privilege(r.oid, t.relation, op.privilege)
    FROM api_roles r
    CROSS JOIN (VALUES ('public.profiles'), ('public.products'),
                       ('product_registration_private.authorized_supervisors')) AS t(relation)
    CROSS JOIN (VALUES ('DELETE'), ('TRUNCATE'), ('TRIGGER')) AS op(privilege)
    WHERE t.relation = 'product_registration_private.authorized_supervisors'
       OR r.role_name IN ('anon', 'authenticated')
  ), registrar_checks AS (
    SELECT 'eagle_product_registrar'::regrole::oid, 'eagle_product_registrar', 'function',
           'product_registration_private.session_uid()'::regprocedure::oid,
           'product_registration_private.session_uid()', NULL::text, 'EXECUTE', true,
           has_function_privilege('eagle_product_registrar',
             'product_registration_private.session_uid()', 'EXECUTE')
    UNION ALL
    SELECT 'postgres'::regrole::oid, 'postgres', 'schema',
           'auth'::regnamespace::oid, 'auth', NULL::text, 'USAGE', true,
           has_schema_privilege('postgres', 'auth', 'USAGE')
    UNION ALL
    SELECT 'postgres'::regrole::oid, 'postgres', 'function',
           'auth.uid()'::regprocedure::oid, 'auth.uid()', NULL::text, 'EXECUTE', true,
           has_function_privilege('postgres', 'auth.uid()', 'EXECUTE')
    UNION ALL
    SELECT 'eagle_product_registrar'::regrole::oid, 'eagle_product_registrar', 'column',
           'product_registration_private.authorized_supervisors'::regclass::oid,
           'product_registration_private.authorized_supervisors', 'user_id', 'SELECT', true,
           has_column_privilege('eagle_product_registrar',
             'product_registration_private.authorized_supervisors', 'user_id', 'SELECT')
  ), checks AS (
    SELECT * FROM rpc_checks UNION ALL SELECT * FROM membership_checks
    UNION ALL SELECT * FROM schema_checks UNION ALL SELECT * FROM session_helper_checks
    UNION ALL SELECT * FROM protected_columns
    UNION ALL SELECT * FROM protected_tables UNION ALL SELECT * FROM registrar_checks
  ), failed AS (
    SELECT * FROM checks WHERE actual IS DISTINCT FROM expected
  )
  SELECT jsonb_agg(jsonb_build_object(
    'role', f.role_name, 'type', f.object_type, 'object', f.object_name,
    'column', f.column_name, 'privilege', f.privilege, 'expected', f.expected, 'actual', f.actual,
    'acl', coalesce(evidence.entries, '[]'::jsonb),
    'membership_path', CASE WHEN f.object_type = 'membership' THEN (
      SELECT ARRAY(SELECT pg_get_userbyid(step.role_id)
                   FROM unnest(m.path) WITH ORDINALITY AS step(role_id, position)
                   ORDER BY step.position)
      FROM memberships m
      WHERE m.origin = f.role_id AND m.current_role_id = f.object_id
      ORDER BY cardinality(m.path), m.path LIMIT 1
    ) END
  ) ORDER BY f.role_name, f.object_name, f.column_name, f.privilege)
  INTO failures
  FROM failed f
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'scope', entries.scope,
      'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'grantor', pg_get_userbyid(a.grantor),
      'applies', CASE WHEN a.grantee = 0 THEN true
                      ELSE pg_has_role(f.role_id, a.grantee, 'USAGE') END,
      'grant_option', a.is_grantable
    )) AS entries
    FROM (
      SELECT 'schema' AS scope, coalesce(n.nspacl, acldefault('n', n.nspowner)) AS acl
      FROM pg_namespace n WHERE f.object_type = 'schema' AND n.oid = f.object_id
      UNION ALL
      SELECT 'function', coalesce(p.proacl, acldefault('f', p.proowner))
      FROM pg_proc p WHERE f.object_type = 'function' AND p.oid = f.object_id
      UNION ALL
      SELECT 'table', coalesce(c.relacl, acldefault('r', c.relowner))
      FROM pg_class c WHERE f.object_type IN ('table', 'column') AND c.oid = f.object_id
      UNION ALL
      SELECT 'column', a.attacl FROM pg_attribute a
      WHERE f.object_type = 'column' AND a.attrelid = f.object_id AND a.attname = f.column_name
    ) entries CROSS JOIN LATERAL aclexplode(entries.acl) a
    WHERE a.privilege_type = f.privilege
  ) evidence ON true;

  IF failures IS NOT NULL THEN
    RAISE EXCEPTION 'La verificación final de acceso falló'
      USING DETAIL = jsonb_pretty(failures);
  END IF;
END;
$verify$;

COMMIT;



