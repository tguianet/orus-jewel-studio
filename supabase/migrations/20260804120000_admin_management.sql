-- =============================================================================
-- Amada Amante — Gerenciamento seguro de administradores
-- Fonte oficial de role: public.user_roles (app_role). Não criar segunda fonte.
-- Não aplicar automaticamente nesta fase (Lovable Cloud).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Auditoria de grant/revoke de admin
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('admin_granted', 'admin_revoked')),
  previous_role text,
  new_role text,
  performed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_role_audit_created
  ON public.admin_role_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_target
  ON public.admin_role_audit_log (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_performer
  ON public.admin_role_audit_log (performed_by, created_at DESC);

ALTER TABLE public.admin_role_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_role_audit_admin_select" ON public.admin_role_audit_log;
CREATE POLICY "admin_role_audit_admin_select"
  ON public.admin_role_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Sem INSERT/UPDATE/DELETE direto pelo cliente — apenas RPCs SECURITY DEFINER.
REVOKE ALL ON TABLE public.admin_role_audit_log FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.admin_role_audit_log TO authenticated;
GRANT ALL ON TABLE public.admin_role_audit_log TO service_role;

-- ---------------------------------------------------------------------------
-- Endurecer user_roles: clientes autenticados só leem; escrita via RPC.
-- (Política antiga FOR ALL permitia admin alterar role direto no PostgREST.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
  END LOOP;
END $$;

-- SELECT próprio ou admin (mantém AuthContext.loadExtras)
DROP POLICY IF EXISTS "Users can view their own roles or admins view all" ON public.user_roles;
CREATE POLICY "Users can view their own roles or admins view all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._admin_active_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.user_roles
  WHERE role = 'admin'::public.app_role;
$$;

REVOKE ALL ON FUNCTION public._admin_active_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._admin_active_count() TO service_role;

-- ---------------------------------------------------------------------------
-- 1) admin_list_administrators
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_administrators()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.granted_at DESC NULLS LAST, x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      ur.user_id,
      COALESCE(NULLIF(trim(p.display_name), ''), split_part(u.email, '@', 1), '') AS nome,
      u.email AS email,
      CASE
        WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'disabled'
        ELSE 'active'
      END AS status,
      ur.created_at,
      COALESCE(g.created_at, ur.created_at) AS granted_at,
      g.performed_by AS granted_by,
      COALESCE(NULLIF(trim(gp.display_name), ''), split_part(gu.email, '@', 1)) AS granted_by_name
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    LEFT JOIN LATERAL (
      SELECT a.created_at, a.performed_by
      FROM public.admin_role_audit_log a
      WHERE a.target_user_id = ur.user_id
        AND a.action = 'admin_granted'
      ORDER BY a.created_at DESC
      LIMIT 1
    ) g ON true
    LEFT JOIN auth.users gu ON gu.id = g.performed_by
    LEFT JOIN public.profiles gp ON gp.user_id = g.performed_by
    WHERE ur.role = 'admin'::public.app_role
  ) x;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', public._admin_active_count()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_administrators() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_administrators() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) admin_search_users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_search_users(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := lower(trim(COALESCE(p_query, '')));
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20);
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF char_length(v_q) < 3 THEN
    RAISE EXCEPTION 'Consulta muito curta';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      u.id AS user_id,
      COALESCE(NULLIF(trim(p.display_name), ''), split_part(u.email, '@', 1), '') AS nome,
      u.email AS email,
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = u.id AND ur.role = 'admin'::public.app_role
      ) AS is_admin,
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = u.id AND ur.role = 'sacoleira'::public.app_role
      ) AS is_sacoleira,
      u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE (
        lower(COALESCE(u.email, '')) LIKE '%' || v_q || '%'
        OR lower(COALESCE(p.display_name, '')) LIKE '%' || v_q || '%'
      )
    ORDER BY
      CASE WHEN lower(COALESCE(u.email, '')) = v_q THEN 0 ELSE 1 END,
      u.created_at DESC
    LIMIT v_limit
  ) x;

  RETURN jsonb_build_object('items', v_items, 'query', p_query, 'limit', v_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search_users(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text, integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) admin_grant_role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_grant_role(
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_exists boolean;
  v_already boolean;
  v_prev text;
  v_inserted int := 0;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id)
  INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'::public.app_role
  ) INTO v_already;

  IF v_already THEN
    -- Idempotente: sem nova auditoria
    RETURN jsonb_build_object(
      'ok', true,
      'already_admin', true,
      'user_id', p_user_id,
      'message', 'Operação já realizada'
    );
  END IF;

  SELECT string_agg(role::text, ',' ORDER BY role::text)
  INTO v_prev
  FROM public.user_roles
  WHERE user_id = p_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    -- Corrida: outro grant ganhou; não duplicar auditoria
    RETURN jsonb_build_object(
      'ok', true,
      'already_admin', true,
      'user_id', p_user_id,
      'message', 'Operação já realizada'
    );
  END IF;

  INSERT INTO public.admin_role_audit_log (
    target_user_id, action, previous_role, new_role, performed_by, reason, metadata
  ) VALUES (
    p_user_id,
    'admin_granted',
    NULLIF(v_prev, ''),
    'admin',
    v_actor,
    NULLIF(trim(COALESCE(p_reason, '')), ''),
    jsonb_build_object('source', 'admin_grant_role')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already_admin', false,
    'user_id', p_user_id,
    'new_role', 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) admin_revoke_role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_is_admin boolean;
  v_admin_count integer;
  v_prev text;
  v_deleted int;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  IF p_reason IS NULL OR char_length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'::public.app_role
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_revoked', true,
      'user_id', p_user_id,
      'message', 'Operação já realizada'
    );
  END IF;

  v_admin_count := public._admin_active_count();
  IF v_admin_count <= 1 THEN
    RAISE EXCEPTION 'Não é possível remover o último admin';
  END IF;

  SELECT string_agg(role::text, ',' ORDER BY role::text)
  INTO v_prev
  FROM public.user_roles
  WHERE user_id = p_user_id;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND role = 'admin'::public.app_role;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_revoked', true,
      'user_id', p_user_id,
      'message', 'Operação já realizada'
    );
  END IF;

  -- Revalida: nunca deixar zero admins (corrida)
  IF public._admin_active_count() < 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE EXCEPTION 'Não é possível remover o último admin';
  END IF;

  INSERT INTO public.admin_role_audit_log (
    target_user_id, action, previous_role, new_role, performed_by, reason, metadata
  ) VALUES (
    p_user_id,
    'admin_revoked',
    NULLIF(v_prev, ''),
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_user_id AND role = 'sacoleira'::public.app_role
      ) THEN 'sacoleira'
      ELSE NULL
    END,
    v_actor,
    trim(p_reason),
    jsonb_build_object(
      'source', 'admin_revoke_role',
      'self_revoke', (p_user_id = v_actor)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already_revoked', false,
    'user_id', p_user_id,
    'self_revoke', (p_user_id = v_actor)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) admin_get_role_audit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_role_audit(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 50);
  v_total bigint;
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT count(*) INTO v_total FROM public.admin_role_audit_log;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      a.id,
      a.target_user_id,
      COALESCE(NULLIF(trim(tp.display_name), ''), split_part(tu.email, '@', 1), '') AS target_name,
      tu.email AS target_email,
      a.action,
      a.previous_role,
      a.new_role,
      a.performed_by,
      COALESCE(NULLIF(trim(pp.display_name), ''), split_part(pu.email, '@', 1), '') AS performed_by_name,
      a.reason,
      a.created_at
    FROM public.admin_role_audit_log a
    LEFT JOIN auth.users tu ON tu.id = a.target_user_id
    LEFT JOIN public.profiles tp ON tp.user_id = a.target_user_id
    LEFT JOIN auth.users pu ON pu.id = a.performed_by
    LEFT JOIN public.profiles pp ON pp.user_id = a.performed_by
    ORDER BY a.created_at DESC
    OFFSET (v_page - 1) * v_size
    LIMIT v_size
  ) x;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_size
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_role_audit(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_role_audit(integer, integer) TO authenticated, service_role;

COMMENT ON TABLE public.admin_role_audit_log IS
  'Auditoria de concessão/revogação de role admin. Escrita apenas via RPCs SECURITY DEFINER.';
COMMENT ON FUNCTION public.admin_list_administrators() IS
  'Lista administradores. Exige is_admin().';
COMMENT ON FUNCTION public.admin_grant_role(uuid, text) IS
  'Promove usuário a admin na fonte oficial user_roles. Exige is_admin().';
COMMENT ON FUNCTION public.admin_revoke_role(uuid, text) IS
  'Remove role admin com proteção de último admin. Exige is_admin() e motivo.';
