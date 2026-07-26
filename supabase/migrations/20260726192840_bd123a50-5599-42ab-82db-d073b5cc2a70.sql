-- =============================================================================
-- Amada Amante — Usuários com múltiplas roles (admin + sacoleira)
-- =============================================================================

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'user_roles'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ~* 'UNIQUE\s*\(\s*user_id\s*\)'
  LOOP
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'user_roles'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE '%user_id%role%'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

ALTER TABLE public.admin_role_audit_log
  DROP CONSTRAINT IF EXISTS admin_role_audit_log_action_check;

ALTER TABLE public.admin_role_audit_log
  ADD CONSTRAINT admin_role_audit_log_action_check
  CHECK (action IN (
    'admin_granted',
    'admin_revoked',
    'reseller_granted',
    'reseller_revoked'
  ));

CREATE OR REPLACE FUNCTION public.current_reseller_id(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id
  FROM public.resellers r
  WHERE r.user_id = _user_id
  ORDER BY r.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_reseller_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_reseller_id(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.current_reseller_id(uuid) IS
  'Reseller do próprio usuário (auth.uid). Funciona com admin+sacoleira; nunca retorna outra sacoleira.';

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
      COALESCE(NULLIF(trim(gp.display_name), ''), split_part(gu.email, '@', 1)) AS granted_by_name,
      EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = ur.user_id AND ur2.role = 'sacoleira'::public.app_role
      ) AS is_sacoleira,
      r.id AS reseller_id,
      s.store_slug,
      s.store_name
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    LEFT JOIN public.resellers r ON r.user_id = ur.user_id
    LEFT JOIN public.seller_stores s ON s.owner_user_id = ur.user_id
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

CREATE OR REPLACE FUNCTION public.admin_grant_reseller_role(
  p_user_id uuid,
  p_reseller_name text,
  p_store_name text,
  p_store_slug text,
  p_sponsor_reseller_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_display text;
  v_slug text;
  v_reseller_id uuid;
  v_store_id uuid;
  v_had_role boolean;
  v_had_reseller boolean;
  v_had_store boolean;
  v_sponsor uuid := p_sponsor_reseller_id;
  v_inserted_role int := 0;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  v_display := NULLIF(trim(COALESCE(p_reseller_name, '')), '');
  IF v_display IS NULL THEN
    SELECT NULLIF(trim(p.display_name), '') INTO v_display
    FROM public.profiles p WHERE p.user_id = p_user_id;
  END IF;
  v_display := COALESCE(v_display, split_part(v_email, '@', 1), 'Sacoleira');

  IF NULLIF(trim(COALESCE(p_store_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Nome da loja obrigatório';
  END IF;

  v_slug := lower(trim(COALESCE(p_store_slug, '')));
  IF v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Slug inválido';
  END IF;

  IF v_sponsor IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.resellers r
      WHERE r.id = v_sponsor AND r.status = 'approved'
    ) THEN
      RAISE EXCEPTION 'Patrocinador inválido';
    END IF;
    IF EXISTS (SELECT 1 FROM public.resellers r WHERE r.user_id = p_user_id AND r.id = v_sponsor) THEN
      RAISE EXCEPTION 'Patrocinador inválido';
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'sacoleira'::public.app_role
  ) INTO v_had_role;

  SELECT id INTO v_reseller_id FROM public.resellers WHERE user_id = p_user_id ORDER BY created_at ASC LIMIT 1;
  v_had_reseller := v_reseller_id IS NOT NULL;

  SELECT id INTO v_store_id FROM public.seller_stores WHERE owner_user_id = p_user_id ORDER BY created_at ASC LIMIT 1;
  v_had_store := v_store_id IS NOT NULL;

  IF EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.store_slug = v_slug
      AND s.owner_user_id IS DISTINCT FROM p_user_id
  ) THEN
    RAISE EXCEPTION 'Slug já em uso';
  END IF;

  IF v_had_role AND v_had_reseller AND v_had_store THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_linked', true,
      'user_id', p_user_id,
      'reseller_id', v_reseller_id,
      'store_id', v_store_id,
      'store_slug', (SELECT store_slug FROM public.seller_stores WHERE id = v_store_id),
      'message', 'Operação já realizada'
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'sacoleira'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  GET DIAGNOSTICS v_inserted_role = ROW_COUNT;

  IF v_reseller_id IS NULL THEN
    INSERT INTO public.resellers (user_id, display_name, email, phone, parent_id, status)
    VALUES (
      p_user_id,
      v_display,
      v_email,
      (SELECT phone FROM public.profiles WHERE user_id = p_user_id LIMIT 1),
      v_sponsor,
      'approved'::public.seller_store_status
    )
    RETURNING id INTO v_reseller_id;
  ELSE
    UPDATE public.resellers
    SET
      display_name = COALESCE(NULLIF(trim(display_name), ''), v_display),
      parent_id = COALESCE(parent_id, v_sponsor),
      status = CASE WHEN status = 'blocked' THEN status ELSE 'approved'::public.seller_store_status END,
      updated_at = now()
    WHERE id = v_reseller_id;
  END IF;

  IF v_store_id IS NULL THEN
    INSERT INTO public.seller_stores (
      owner_user_id, reseller_id, store_name, store_slug, contact_phone, status, theme
    ) VALUES (
      p_user_id,
      v_reseller_id,
      trim(p_store_name),
      v_slug,
      (SELECT phone FROM public.profiles WHERE user_id = p_user_id LIMIT 1),
      'approved'::public.seller_store_status,
      jsonb_build_object('primaryColor', '#d4a747', 'secondaryColor', '#f5e6c8')
    )
    RETURNING id INTO v_store_id;
  ELSE
    UPDATE public.seller_stores
    SET
      reseller_id = COALESCE(reseller_id, v_reseller_id),
      store_name = trim(p_store_name),
      store_slug = v_slug,
      status = CASE WHEN status = 'blocked' THEN status ELSE 'approved'::public.seller_store_status END,
      updated_at = now()
    WHERE id = v_store_id;
  END IF;

  IF v_inserted_role > 0 OR NOT v_had_reseller OR NOT v_had_store THEN
    INSERT INTO public.admin_role_audit_log (
      target_user_id, action, previous_role, new_role, performed_by, reason, metadata
    ) VALUES (
      p_user_id,
      'reseller_granted',
      CASE WHEN public.is_admin(p_user_id) THEN 'admin' ELSE NULL END,
      'admin+sacoleira',
      v_actor,
      NULLIF(trim(COALESCE(p_reason, '')), ''),
      jsonb_build_object(
        'source', 'admin_grant_reseller_role',
        'reseller_id', v_reseller_id,
        'store_id', v_store_id,
        'store_slug', v_slug,
        'sponsor_reseller_id', v_sponsor
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'already_linked', false,
    'user_id', p_user_id,
    'reseller_id', v_reseller_id,
    'store_id', v_store_id,
    'store_slug', v_slug,
    'kept_admin', public.is_admin(p_user_id),
    'has_sacoleira', public.has_role(p_user_id, 'sacoleira'::public.app_role)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_reseller_role(uuid, text, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_reseller_role(uuid, text, text, text, uuid, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_revoke_reseller_role(
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
  v_had_role boolean;
  v_reseller_id uuid;
  v_deleted int := 0;
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
    WHERE user_id = p_user_id AND role = 'sacoleira'::public.app_role
  ) INTO v_had_role;

  SELECT id INTO v_reseller_id FROM public.resellers WHERE user_id = p_user_id ORDER BY created_at ASC LIMIT 1;

  IF NOT v_had_role THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_revoked', true,
      'user_id', p_user_id,
      'kept_admin', public.is_admin(p_user_id),
      'message', 'Operação já realizada'
    );
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND role = 'sacoleira'::public.app_role;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_reseller_id IS NOT NULL THEN
    UPDATE public.resellers
    SET status = 'blocked'::public.seller_store_status, updated_at = now()
    WHERE id = v_reseller_id;

    UPDATE public.seller_stores
    SET status = 'blocked'::public.seller_store_status, updated_at = now()
    WHERE reseller_id = v_reseller_id OR owner_user_id = p_user_id;
  END IF;

  IF v_deleted > 0 THEN
    INSERT INTO public.admin_role_audit_log (
      target_user_id, action, previous_role, new_role, performed_by, reason, metadata
    ) VALUES (
      p_user_id,
      'reseller_revoked',
      'sacoleira',
      CASE WHEN public.is_admin(p_user_id) THEN 'admin' ELSE NULL END,
      v_actor,
      trim(p_reason),
      jsonb_build_object(
        'source', 'admin_revoke_reseller_role',
        'reseller_id', v_reseller_id,
        'financial_history_preserved', true,
        'store_preserved', true
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'already_revoked', v_deleted = 0,
    'user_id', p_user_id,
    'kept_admin', public.is_admin(p_user_id),
    'has_sacoleira', public.has_role(p_user_id, 'sacoleira'::public.app_role)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_reseller_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_reseller_role(uuid, text)
  TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_resellers_user_id ON public.resellers (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_stores_owner_user_id ON public.seller_stores (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_seller_stores_reseller_id ON public.seller_stores (reseller_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_target ON public.admin_role_audit_log (target_user_id, created_at DESC);

COMMENT ON FUNCTION public.admin_grant_reseller_role(uuid, text, text, text, uuid, text) IS
  'Adiciona role sacoleira + reseller + loja sem remover admin.';
COMMENT ON FUNCTION public.admin_revoke_reseller_role(uuid, text) IS
  'Remove role sacoleira e bloqueia loja; preserva admin e histórico financeiro.';