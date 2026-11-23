-- HU-INV-01. Ensayo integrado de cierre del Kardex y registro de entradas.
-- Confirmar primero el esquema desplegado con compatibilidad.sql.
-- Ejecutar manualmente como postgres. El ensayo termina en ROLLBACK.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, public;

LOCK TABLE public.profiles, public.products, public.inventory_movements IN ACCESS EXCLUSIVE MODE;

DO $preflight$
BEGIN
  IF current_user <> 'postgres'
     OR to_regprocedure('product_registration_private.session_uid()') IS NULL
     OR (SELECT count(*) FROM pg_class c
         WHERE c.oid IN ('public.profiles'::regclass, 'public.products'::regclass)
           AND c.relrowsecurity) <> 2 THEN
    RAISE EXCEPTION 'Faltan las protecciones comprobadas de sesión y RLS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('inventory_movements', 'id', 'text', true), ('inventory_movements', 'productId', 'text', true),
      ('inventory_movements', 'quantity', 'integer', true), ('inventory_movements', 'stockBefore', 'integer', true),
      ('inventory_movements', 'stockAfter', 'integer', true), ('inventory_movements', 'reason', 'text', false),
      ('inventory_movements', 'createdAt', 'timestamp(3) without time zone', true),
      ('products', 'id', 'text', true), ('products', 'stock', 'integer', true),
      ('products', 'updatedAt', 'timestamp(3) without time zone', true)
    ) expected(relation, name, type, required)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = to_regclass('public.' || expected.relation) AND a.attname = expected.name
        AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = '' AND a.attidentity = ''
        AND format_type(a.atttypid, a.atttypmod) = expected.type
        AND (NOT expected.required OR a.attnotnull)
    )
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_enum e ON e.enumtypid = a.atttypid
    WHERE a.attrelid = 'public.inventory_movements'::regclass AND a.attname = 'type'
      AND a.attnotnull AND NOT a.attisdropped AND e.enumlabel = 'ENTRADA_COMPRA'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attname = 'id'
    WHERE c.conrelid = 'public.inventory_movements'::regclass AND c.contype = 'p'
      AND c.conkey = ARRAY[a.attnum] AND NOT c.condeferrable AND c.convalidated
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attname = 'productId'
    JOIN pg_attribute b ON b.attrelid = c.confrelid AND b.attname = 'id'
    WHERE c.conrelid = 'public.inventory_movements'::regclass AND c.confrelid = 'public.products'::regclass
      AND c.contype = 'f' AND c.convalidated AND c.conkey = ARRAY[a.attnum] AND c.confkey = ARRAY[b.attnum]
  ) THEN
    RAISE EXCEPTION 'El esquema desplegado no coincide con el contrato esperado de inventario';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute a LEFT JOIN pg_attrdef d ON (d.adrelid, d.adnum) = (a.attrelid, a.attnum)
    WHERE a.attrelid = 'public.inventory_movements'::regclass AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attnotnull AND a.attidentity = '' AND a.attgenerated = '' AND d.oid IS NULL
      AND a.attname NOT IN ('id', 'productId', 'type', 'quantity', 'stockBefore', 'stockAfter', 'reason', 'createdAt')
  ) OR EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid IN ('public.products'::regclass, 'public.inventory_movements'::regclass)
      AND NOT t.tgisinternal AND t.tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Hay campos obligatorios o triggers de inventario todavía sin revisar';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'inventory_movements'
      AND p.policyname = 'Permitir movimientos de inventario a usuarios autenticados'
      AND p.roles = ARRAY['authenticated']::name[] AND p.cmd = 'ALL'
      AND p.permissive = 'PERMISSIVE' AND p.qual = 'true' AND p.with_check IS NULL
  ) THEN
    RAISE EXCEPTION 'La política abierta de Kardex no coincide con la definición confirmada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'inventory_movements'
      AND p.policyname <> 'Permitir movimientos de inventario a usuarios autenticados'
      AND ('public' = ANY(p.roles) OR EXISTS (
        SELECT 1 FROM pg_roles api CROSS JOIN pg_roles target
        WHERE api.rolname IN ('anon', 'authenticated', 'authenticator')
          AND target.rolname = ANY(p.roles)
          AND (api.oid = target.oid OR pg_has_role(api.oid, target.oid, 'MEMBER'))
      ))
  ) THEN
    RAISE EXCEPTION 'Existe otra política de Kardex aplicable a la API; revisa su alcance';
  END IF;

END;
$preflight$;

-- Revocación validada en permisos-kardex.sql; queda en la misma transacción.
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

DROP POLICY "Permitir movimientos de inventario a usuarios autenticados"
  ON public.inventory_movements;

CREATE ROLE eagle_inventory_entry NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT eagle_inventory_entry TO CURRENT_USER;

GRANT USAGE ON SCHEMA public, product_registration_private TO eagle_inventory_entry;
GRANT EXECUTE ON FUNCTION product_registration_private.session_uid() TO eagle_inventory_entry;
GRANT SELECT (id, role) ON public.profiles TO eagle_inventory_entry;
GRANT SELECT (id, stock, "updatedAt"), UPDATE (stock, "updatedAt") ON public.products TO eagle_inventory_entry;
GRANT SELECT (id, "productId", type, quantity, "stockBefore", "stockAfter", reason, "createdAt"),
  INSERT (id, "productId", type, quantity, "stockBefore", "stockAfter", reason, "createdAt")
  ON public.inventory_movements TO eagle_inventory_entry;

CREATE POLICY eagle_inventory_profile_self ON public.profiles
  FOR SELECT TO eagle_inventory_entry
  USING (id::text = (SELECT product_registration_private.session_uid())::text);

CREATE FUNCTION public.can_record_inventory_entry()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (SELECT product_registration_private.session_uid())::text
      AND p.role = 'ADMIN'
  );
$$;

CREATE POLICY eagle_inventory_products_read ON public.products
  FOR SELECT TO eagle_inventory_entry USING ((SELECT public.can_record_inventory_entry()));
CREATE POLICY eagle_inventory_products_stock ON public.products
  FOR UPDATE TO eagle_inventory_entry USING ((SELECT public.can_record_inventory_entry()))
  WITH CHECK ((SELECT public.can_record_inventory_entry()) AND stock >= 0);
CREATE POLICY eagle_inventory_movements_read ON public.inventory_movements
  FOR SELECT TO eagle_inventory_entry USING ((SELECT public.can_record_inventory_entry()));
CREATE POLICY eagle_inventory_movements_insert ON public.inventory_movements
  FOR INSERT TO eagle_inventory_entry WITH CHECK (
    (SELECT public.can_record_inventory_entry()) AND type = 'ENTRADA_COMPRA'
    AND quantity > 0 AND "stockBefore" >= 0 AND "stockAfter"::bigint = "stockBefore"::bigint + quantity
  );

CREATE FUNCTION public.list_inventory_movements(p_offset integer, p_limit integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NOT public.can_record_inventory_entry() THEN
    RAISE EXCEPTION 'Historial no autorizado' USING ERRCODE = '42501';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Paginación inválida' USING ERRCODE = '22023';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m."createdAt" DESC, m.id DESC), '[]'::jsonb)
    FROM (
      SELECT id, "productId", type, quantity, "stockBefore", "stockAfter", reason, "createdAt"
      FROM public.inventory_movements
      ORDER BY "createdAt" DESC, id DESC
      OFFSET p_offset LIMIT p_limit
    ) m
  );
END;
$$;

CREATE FUNCTION public.record_inventory_entry(
  p_request_id uuid, p_product_id text, p_quantity numeric, p_reason text, p_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  before_stock integer;
  quantity_value integer;
  after_stock integer;
  reason_value text := btrim(p_reason);
  notes_value text := nullif(btrim(p_notes), '');
  movement_reason text;
  receipt jsonb;
  recovered boolean;
BEGIN
  IF NOT public.can_record_inventory_entry() THEN
    RAISE EXCEPTION 'Entrada no autorizada' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR nullif(btrim(p_product_id), '') IS NULL
     OR p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 2147483647
     OR p_quantity <> trunc(p_quantity) OR reason_value IS NULL
     OR reason_value !~ '[^[:space:]]' OR reason_value ~ E'[\\r\\n]'
     OR length(reason_value) > 200 OR length(notes_value) > 1000 THEN
    RAISE EXCEPTION 'Datos de entrada inválidos' USING ERRCODE = '22023';
  END IF;
  quantity_value := p_quantity::integer;
  -- Prisma solo declara reason. Se conserva el motivo y se adjunta la nota opcional.
  movement_reason := reason_value || coalesce(E'\nObservaciones: ' || notes_value, '');

  SELECT p.stock INTO before_stock FROM public.products p WHERE p.id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado' USING ERRCODE = 'P0002';
  END IF;

  -- El ID de movimiento es el ID de solicitud. La PK arbitra solicitudes concurrentes.
  SELECT to_jsonb(m) INTO receipt FROM (
    SELECT id, "productId", type, quantity, "stockBefore", "stockAfter", reason, "createdAt"
    FROM public.inventory_movements WHERE id = p_request_id::text
  ) m;

  IF receipt IS NULL THEN
    IF before_stock IS NULL OR before_stock < 0 OR before_stock::bigint + quantity_value > 2147483647 THEN
      RAISE EXCEPTION 'Stock resultante inválido' USING ERRCODE = '22003';
    END IF;
    after_stock := before_stock + quantity_value;

    WITH inserted AS (
      INSERT INTO public.inventory_movements (
        id, "productId", type, quantity, "stockBefore", "stockAfter", reason, "createdAt"
      ) VALUES (
        p_request_id::text, p_product_id, 'ENTRADA_COMPRA', quantity_value,
        before_stock, after_stock, movement_reason, clock_timestamp() AT TIME ZONE 'UTC'
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id, "productId", type, quantity, "stockBefore", "stockAfter", reason, "createdAt"
    )
    SELECT to_jsonb(i) INTO receipt FROM inserted i;

    IF receipt IS NOT NULL THEN
      UPDATE public.products
      SET stock = after_stock,
          "updatedAt" = greatest("updatedAt" + interval '1 millisecond',
                                date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC'))
      WHERE id = p_product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No se pudo actualizar el stock' USING ERRCODE = '42501';
      END IF;
      RETURN jsonb_build_object('movement', receipt, 'stock', after_stock, 'replayed', false);
    END IF;

    SELECT to_jsonb(m) INTO receipt FROM (
      SELECT id, "productId", type, quantity, "stockBefore", "stockAfter", reason, "createdAt"
      FROM public.inventory_movements WHERE id = p_request_id::text
    ) m;
  END IF;

  recovered := receipt IS NOT NULL AND receipt ->> 'productId' = p_product_id
    AND receipt ->> 'type' = 'ENTRADA_COMPRA' AND (receipt ->> 'quantity')::int = quantity_value
    AND receipt ->> 'reason' = movement_reason;
  IF recovered IS NOT TRUE THEN
    RAISE EXCEPTION 'Identificador de solicitud en conflicto' USING ERRCODE = '23505';
  END IF;

  RETURN jsonb_build_object('movement', receipt, 'stock', (receipt ->> 'stockAfter')::int, 'replayed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.can_record_inventory_entry(), public.list_inventory_movements(integer, integer),
  public.record_inventory_entry(uuid, text, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_record_inventory_entry(), public.list_inventory_movements(integer, integer),
  public.record_inventory_entry(uuid, text, numeric, text, text) TO authenticated;

GRANT CREATE ON SCHEMA public TO eagle_inventory_entry;
ALTER FUNCTION public.can_record_inventory_entry() OWNER TO eagle_inventory_entry;
ALTER FUNCTION public.list_inventory_movements(integer, integer) OWNER TO eagle_inventory_entry;
ALTER FUNCTION public.record_inventory_entry(uuid, text, numeric, text, text) OWNER TO eagle_inventory_entry;
REVOKE CREATE ON SCHEMA public FROM eagle_inventory_entry;
REVOKE eagle_inventory_entry FROM CURRENT_USER;

DO $verify$
BEGIN
  IF (SELECT count(*) FROM pg_class c WHERE c.oid IN (
        'public.profiles'::regclass, 'public.products'::regclass, 'public.inventory_movements'::regclass
      ) AND c.relrowsecurity) <> 3 OR EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'inventory_movements'
      AND p.roles && ARRAY['public', 'anon', 'authenticated', 'authenticator']::name[]
  ) OR (SELECT count(*) FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = 'inventory_movements'
          AND p.roles = ARRAY['eagle_inventory_entry']::name[]
          AND ((p.policyname = 'eagle_inventory_movements_read' AND p.cmd = 'SELECT')
            OR (p.policyname = 'eagle_inventory_movements_insert' AND p.cmd = 'INSERT'))) <> 2
    OR EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('authenticator')) AS r(name)
    WHERE pg_has_role(r.name, 'eagle_inventory_entry', 'MEMBER')
  ) OR EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('authenticator')) AS r(name)
    WHERE has_any_column_privilege(r.name, 'public.inventory_movements', 'SELECT, INSERT, UPDATE, REFERENCES')
       OR has_table_privilege(r.name, 'public.inventory_movements', 'DELETE, TRUNCATE, TRIGGER')
       OR has_any_column_privilege(r.name, 'public.products', 'INSERT, UPDATE')
       OR has_table_privilege(r.name, 'public.products', 'DELETE, TRUNCATE, TRIGGER')
  ) OR EXISTS (
    SELECT 1 FROM pg_attribute a WHERE a.attrelid = 'public.products'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attname NOT IN ('stock', 'updatedAt')
      AND has_column_privilege('eagle_inventory_entry', a.attrelid, a.attnum, 'UPDATE')
  ) OR has_any_column_privilege('eagle_inventory_entry', 'public.inventory_movements', 'UPDATE')
    OR has_table_privilege('eagle_inventory_entry', 'public.inventory_movements', 'DELETE, TRUNCATE, TRIGGER')
    OR has_column_privilege('eagle_inventory_entry', 'public.products', 'costPrice', 'SELECT')
    OR NOT has_function_privilege('eagle_inventory_entry', 'product_registration_private.session_uid()', 'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM (VALUES ('public.can_record_inventory_entry()'), ('public.list_inventory_movements(integer,integer)'),
                            ('public.record_inventory_entry(uuid,text,numeric,text,text)')) AS f(signature)
      WHERE has_function_privilege('anon', f.signature, 'EXECUTE')
         OR NOT has_function_privilege('authenticated', f.signature, 'EXECUTE')
    ) THEN
    RAISE EXCEPTION 'La verificación de permisos de Inventario falló';
  END IF;
END;
$verify$;

ROLLBACK;


