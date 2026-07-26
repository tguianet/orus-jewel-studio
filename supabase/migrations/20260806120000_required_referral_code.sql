-- =============================================================================
-- Código de indicação obrigatório (sacoleira)
-- NÃO aplicar automaticamente — revisar e aplicar no Lovable Cloud.
--
-- Modelo oficial:
--   - Vínculo de rede: resellers.parent_id (patrocinadora direta = nível 1 upline)
--   - Código compartilhável: resellers.referral_code (único, normalizado UPPER)
--   - UUID de resellers.id continua aceito como legado na validação
--   - Comissões MLM (3 níveis) seguem parent_id — sem mudança de algoritmo
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Coluna referral_code + histórico (códigos antigos ficam inválidos)
-- ---------------------------------------------------------------------------
ALTER TABLE public.resellers
  ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE public.resellers
  ADD COLUMN IF NOT EXISTS can_receive_referrals boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.referral_code_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  code text NOT NULL,
  retired_at timestamptz NOT NULL DEFAULT now(),
  retired_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text
);

CREATE INDEX IF NOT EXISTS idx_referral_code_history_reseller
  ON public.referral_code_history (reseller_id, retired_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_code_history_code
  ON public.referral_code_history (code);

ALTER TABLE public.referral_code_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_referral_code_history" ON public.referral_code_history;
CREATE POLICY "admin_select_referral_code_history"
  ON public.referral_code_history FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.referral_code_history FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.referral_code_history TO authenticated;
GRANT ALL ON TABLE public.referral_code_history TO service_role;

-- Rate limit lógico de validação
CREATE TABLE IF NOT EXISTS public.referral_validation_attempts (
  id bigserial PRIMARY KEY,
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_validation_attempts_key_created
  ON public.referral_validation_attempts (client_key, created_at DESC);

REVOKE ALL ON TABLE public.referral_validation_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.referral_validation_attempts TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_referral_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    upper(regexp_replace(trim(COALESCE(p_code, '')), '\s+', '', 'g')),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.resellers WHERE referral_code = result
    );
  END LOOP;
  RETURN result;
END;
$$;

-- Backfill códigos existentes
UPDATE public.resellers r
SET referral_code = public.generate_referral_code()
WHERE r.referral_code IS NULL OR trim(r.referral_code) = '';

ALTER TABLE public.resellers
  ALTER COLUMN referral_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resellers_referral_code_key'
  ) THEN
    ALTER TABLE public.resellers
      ADD CONSTRAINT resellers_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_resellers_assign_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR trim(NEW.referral_code) = '' THEN
    NEW.referral_code := public.generate_referral_code();
  ELSE
    NEW.referral_code := public.normalize_referral_code(NEW.referral_code);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resellers_assign_referral_code ON public.resellers;
CREATE TRIGGER trg_resellers_assign_referral_code
  BEFORE INSERT OR UPDATE OF referral_code ON public.resellers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_resellers_assign_referral_code();

CREATE OR REPLACE FUNCTION public.would_create_reseller_cycle(
  p_reseller_id uuid,
  p_new_parent_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_walk uuid := p_new_parent_id;
  v_guard int := 0;
BEGIN
  IF p_reseller_id IS NULL OR p_new_parent_id IS NULL THEN
    RETURN false;
  END IF;
  IF p_reseller_id = p_new_parent_id THEN
    RETURN true;
  END IF;
  WHILE v_walk IS NOT NULL AND v_guard < 64 LOOP
    IF v_walk = p_reseller_id THEN
      RETURN true;
    END IF;
    SELECT parent_id INTO v_walk FROM public.resellers WHERE id = v_walk;
    v_guard := v_guard + 1;
  END LOOP;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_referral_sponsor(p_code text)
RETURNS TABLE (
  sponsor_reseller_id uuid,
  sponsor_name text,
  store_name text,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := public.normalize_referral_code(p_code);
  v_uuid uuid;
  v_row public.resellers%ROWTYPE;
  v_store_name text;
  v_store_status public.seller_store_status;
BEGIN
  IF v_code IS NULL THEN
    sponsor_reseller_id := NULL;
    sponsor_name := NULL;
    store_name := NULL;
    reason := 'empty';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Legado: UUID de resellers.id
  BEGIN
    v_uuid := v_code::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_uuid := NULL;
  END;

  IF v_uuid IS NOT NULL THEN
    SELECT * INTO v_row FROM public.resellers WHERE id = v_uuid LIMIT 1;
  END IF;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row
    FROM public.resellers
    WHERE referral_code = v_code
    LIMIT 1;
  END IF;

  IF v_row.id IS NULL THEN
    -- Código antigo regenerado?
    IF EXISTS (SELECT 1 FROM public.referral_code_history h WHERE h.code = v_code) THEN
      reason := 'inactive';
    ELSE
      reason := 'not_found';
    END IF;
    sponsor_reseller_id := NULL;
    sponsor_name := NULL;
    store_name := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT s.store_name, s.status
  INTO v_store_name, v_store_status
  FROM public.seller_stores s
  WHERE s.reseller_id = v_row.id
  ORDER BY s.created_at ASC
  LIMIT 1;

  IF v_row.status = 'blocked' OR v_store_status = 'blocked' THEN
    reason := 'blocked';
    sponsor_reseller_id := NULL;
    sponsor_name := NULL;
    store_name := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_row.status IS DISTINCT FROM 'approved' THEN
    reason := 'inactive';
    sponsor_reseller_id := NULL;
    sponsor_name := NULL;
    store_name := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT COALESCE(v_row.can_receive_referrals, true) THEN
    reason := 'blocked';
    sponsor_reseller_id := NULL;
    sponsor_name := NULL;
    store_name := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  sponsor_reseller_id := v_row.id;
  sponsor_name := v_row.display_name;
  store_name := COALESCE(v_store_name, v_row.display_name);
  reason := 'ok';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public._referral_rate_limit_ok(p_client_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := NULLIF(trim(COALESCE(p_client_key, '')), '');
  v_count int;
BEGIN
  IF v_key IS NULL THEN
    v_key := coalesce(auth.uid()::text, 'anon');
  END IF;
  -- janela 15 min / 40 tentativas
  DELETE FROM public.referral_validation_attempts
  WHERE created_at < now() - interval '1 day';

  INSERT INTO public.referral_validation_attempts (client_key) VALUES (v_key);

  SELECT count(*) INTO v_count
  FROM public.referral_validation_attempts
  WHERE client_key = v_key
    AND created_at > now() - interval '15 minutes';

  RETURN v_count <= 40;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) validate_referral_code (anon + authenticated)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_referral_code(
  p_code text,
  p_client_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sponsor record;
BEGIN
  IF NOT public._referral_rate_limit_ok(p_client_key) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'sponsor_reseller_id', NULL,
      'sponsor_name', NULL,
      'store_name', NULL,
      'reason', 'rate_limited'
    );
  END IF;

  SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(p_code) LIMIT 1;

  IF v_sponsor.reason = 'ok' THEN
    RETURN jsonb_build_object(
      'valid', true,
      'sponsor_reseller_id', v_sponsor.sponsor_reseller_id,
      'sponsor_name', v_sponsor.sponsor_name,
      'store_name', v_sponsor.store_name,
      'reason', 'ok'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', false,
    'sponsor_reseller_id', NULL,
    'sponsor_name', NULL,
    'store_name', NULL,
    'reason', COALESCE(v_sponsor.reason, 'not_found')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_referral_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) handle_new_user — exige patrocinadora (exceto bootstrap admin_root)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_uuid uuid := NULL;
  parent_raw text := NULLIF(NEW.raw_user_meta_data ->> 'parent_reseller_id', '');
  referral_raw text := NULLIF(NEW.raw_user_meta_data ->> 'referral_code', '');
  allow_root boolean := COALESCE((NEW.raw_user_meta_data ->> 'allow_root_without_sponsor')::boolean, false);
  display text := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1),
    ''
  );
  phone_text text := NEW.raw_user_meta_data ->> 'phone';
  base_slug text;
  final_slug text;
  i int := 0;
  reseller_uuid uuid;
  v_sponsor record;
BEGIN
  -- Resolver patrocinadora: referral_code tem prioridade
  IF referral_raw IS NOT NULL THEN
    SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(referral_raw) LIMIT 1;
    IF v_sponsor.reason = 'ok' THEN
      parent_uuid := v_sponsor.sponsor_reseller_id;
    ELSE
      RAISE EXCEPTION 'Código de indicação inválido (%)', v_sponsor.reason
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF parent_raw IS NOT NULL THEN
    SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(parent_raw) LIMIT 1;
    IF v_sponsor.reason = 'ok' THEN
      parent_uuid := v_sponsor.sponsor_reseller_id;
    ELSE
      RAISE EXCEPTION 'Código de indicação inválido (%)', v_sponsor.reason
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF allow_root THEN
    parent_uuid := NULL;
  ELSE
    RAISE EXCEPTION 'Código de indicação obrigatório'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, display, phone_text)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sacoleira'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.resellers (
    user_id, display_name, email, phone, parent_id, status, referral_code
  )
  VALUES (
    NEW.id, display, NEW.email, phone_text, parent_uuid, 'pending',
    public.generate_referral_code()
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO reseller_uuid;

  IF reseller_uuid IS NULL THEN
    SELECT id INTO reseller_uuid FROM public.resellers WHERE user_id = NEW.id LIMIT 1;
    -- Se já existia sem parent e agora temos parent, vincula uma vez
    IF parent_uuid IS NOT NULL THEN
      UPDATE public.resellers
      SET parent_id = COALESCE(parent_id, parent_uuid), updated_at = now()
      WHERE id = reseller_uuid AND parent_id IS NULL;
    END IF;
  END IF;

  base_slug := regexp_replace(lower(coalesce(display, split_part(NEW.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'loja';
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.seller_stores WHERE store_slug = final_slug) LOOP
    i := i + 1;
    final_slug := base_slug || '-' || i::text;
  END LOOP;

  INSERT INTO public.seller_stores (
    owner_user_id, reseller_id, store_name, store_slug, contact_phone, status, theme
  )
  SELECT
    NEW.id,
    reseller_uuid,
    COALESCE(display, 'Minha loja'),
    final_slug,
    phone_text,
    'pending'::public.seller_store_status,
    jsonb_build_object('primaryColor', '#d4a747', 'secondaryColor', '#f5e6c8')
  WHERE NOT EXISTS (
    SELECT 1 FROM public.seller_stores s WHERE s.owner_user_id = NEW.id
  );

  PERFORM public.write_audit_log(
    'reseller_registered',
    'resellers',
    reseller_uuid::text,
    NULL,
    jsonb_build_object(
      'user_id', NEW.id,
      'parent_id', parent_uuid,
      'email', NEW.email
    ),
    jsonb_build_object('source', 'handle_new_user')
  );

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) register_reseller_with_referral
-- Cria usuário auth + deixa handle_new_user montar reseller/loja/role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_reseller_with_referral(
  p_full_name text,
  p_email text,
  p_phone text,
  p_password text,
  p_referral_code text,
  p_client_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_name text := trim(COALESCE(p_full_name, ''));
  v_phone text := NULLIF(trim(COALESCE(p_phone, '')), '');
  v_password text := COALESCE(p_password, '');
  v_code text := public.normalize_referral_code(p_referral_code);
  v_sponsor record;
  v_user_id uuid := gen_random_uuid();
  v_instance_id uuid;
  v_reseller_id uuid;
  v_encrypted text;
BEGIN
  IF NOT public._referral_rate_limit_ok(p_client_key) THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Informe o nome completo';
  END IF;
  IF v_email = '' OR v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'E-mail inválido';
  END IF;
  IF length(v_password) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter no mínimo 6 caracteres';
  END IF;
  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Código de indicação obrigatório';
  END IF;

  SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(v_code) LIMIT 1;
  IF v_sponsor.reason IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'Código de indicação inválido (%)', COALESCE(v_sponsor.reason, 'not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email) THEN
    RAISE EXCEPTION 'Já existe uma conta com este e-mail';
  END IF;

  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  v_encrypted := crypt(v_password, gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_instance_id,
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted,
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'display_name', v_name,
      'phone', v_phone,
      'referral_code', v_code,
      'parent_reseller_id', v_sponsor.sponsor_reseller_id::text
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_email,
    now(),
    now(),
    now()
  );

  SELECT id INTO v_reseller_id FROM public.resellers WHERE user_id = v_user_id LIMIT 1;

  IF v_reseller_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.resellers r
    WHERE r.id = v_reseller_id AND r.parent_id = v_sponsor.sponsor_reseller_id
  ) THEN
    -- Rollback lógico: remove user se vínculo falhou
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
    RAISE EXCEPTION 'Cadastro sem patrocinadora não concluído';
  END IF;

  PERFORM public.write_audit_log(
    'reseller_registered_with_referral',
    'resellers',
    v_reseller_id::text,
    NULL,
    jsonb_build_object(
      'user_id', v_user_id,
      'parent_id', v_sponsor.sponsor_reseller_id,
      'sponsor_name', v_sponsor.sponsor_name
    ),
    jsonb_build_object('source', 'register_reseller_with_referral')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'reseller_id', v_reseller_id,
    'sponsor_reseller_id', v_sponsor.sponsor_reseller_id,
    'sponsor_name', v_sponsor.sponsor_name
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Já existe uma conta com este e-mail';
END;
$$;

REVOKE ALL ON FUNCTION public.register_reseller_with_referral(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_reseller_with_referral(text, text, text, text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Vínculo pós-login (legado sem parent) via código
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_my_reseller_parent_by_code(p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_id uuid;
  my_parent uuid;
  v_sponsor record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT r.id, r.parent_id INTO my_id, my_parent
  FROM public.resellers r
  WHERE r.user_id = auth.uid()
  LIMIT 1;

  IF my_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de sacoleira não encontrado';
  END IF;

  IF my_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Indicação já definida e não pode ser alterada';
  END IF;

  SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(p_referral_code) LIMIT 1;
  IF v_sponsor.reason IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'Código de indicação inválido (%)', COALESCE(v_sponsor.reason, 'not_found');
  END IF;

  IF v_sponsor.sponsor_reseller_id = my_id THEN
    RAISE EXCEPTION 'Você não pode se indicar';
  END IF;

  IF public.would_create_reseller_cycle(my_id, v_sponsor.sponsor_reseller_id) THEN
    RAISE EXCEPTION 'Esta indicação criaria um ciclo na rede';
  END IF;

  UPDATE public.resellers
  SET parent_id = v_sponsor.sponsor_reseller_id, updated_at = now()
  WHERE id = my_id;

  PERFORM public.write_audit_log(
    'reseller_parent_set',
    'resellers',
    my_id::text,
    jsonb_build_object('parent_id', NULL),
    jsonb_build_object('parent_id', v_sponsor.sponsor_reseller_id),
    jsonb_build_object('source', 'set_my_reseller_parent_by_code')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'sponsor_reseller_id', v_sponsor.sponsor_reseller_id,
    'sponsor_name', v_sponsor.sponsor_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_reseller_parent_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_reseller_parent_by_code(text) TO authenticated;

-- Atualiza set_my_reseller_parent (UUID) com anti-ciclo
CREATE OR REPLACE FUNCTION public.set_my_reseller_parent(_parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_id uuid;
  my_parent uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT r.id, r.parent_id INTO my_id, my_parent
  FROM public.resellers r
  WHERE r.user_id = auth.uid()
  LIMIT 1;

  IF my_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de sacoleira não encontrado';
  END IF;

  IF my_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Indicação já definida e não pode ser alterada';
  END IF;

  IF _parent_id = my_id THEN
    RAISE EXCEPTION 'Você não pode se indicar';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.resellers r
    WHERE r.id = _parent_id
      AND r.status = 'approved'
      AND COALESCE(r.can_receive_referrals, true)
  ) THEN
    RAISE EXCEPTION 'Indicação não encontrada ou inativa';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.reseller_id = _parent_id AND s.status = 'blocked'
  ) THEN
    RAISE EXCEPTION 'Indicação bloqueada';
  END IF;

  IF public.would_create_reseller_cycle(my_id, _parent_id) THEN
    RAISE EXCEPTION 'Esta indicação criaria um ciclo na rede';
  END IF;

  UPDATE public.resellers
  SET parent_id = _parent_id, updated_at = now()
  WHERE id = my_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Admin: regenerar código / corrigir patrocinadora / criar raiz
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_regenerate_referral_code(
  p_reseller_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old text;
  v_new text;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT referral_code INTO v_old FROM public.resellers WHERE id = p_reseller_id;
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'Sacoleira não encontrada';
  END IF;

  v_new := public.generate_referral_code();

  INSERT INTO public.referral_code_history (reseller_id, code, retired_by, reason)
  VALUES (p_reseller_id, v_old, v_actor, COALESCE(NULLIF(trim(p_reason), ''), 'regenerate'));

  UPDATE public.resellers
  SET referral_code = v_new, updated_at = now()
  WHERE id = p_reseller_id;

  PERFORM public.write_audit_log(
    'referral_code_regenerated',
    'resellers',
    p_reseller_id::text,
    jsonb_build_object('referral_code', v_old),
    jsonb_build_object('referral_code', v_new),
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('ok', true, 'referral_code', v_new, 'previous_code', v_old);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_reseller_sponsor(
  p_reseller_id uuid,
  p_sponsor_reseller_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo da correção';
  END IF;

  IF p_reseller_id IS NULL OR p_sponsor_reseller_id IS NULL THEN
    RAISE EXCEPTION 'Patrocinadora obrigatória';
  END IF;

  IF p_reseller_id = p_sponsor_reseller_id THEN
    RAISE EXCEPTION 'Autoindicação não permitida';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.resellers r
    WHERE r.id = p_sponsor_reseller_id AND r.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Patrocinadora inválida ou inativa';
  END IF;

  IF public.would_create_reseller_cycle(p_reseller_id, p_sponsor_reseller_id) THEN
    RAISE EXCEPTION 'Esta alteração criaria um ciclo na rede';
  END IF;

  SELECT parent_id INTO v_old FROM public.resellers WHERE id = p_reseller_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sacoleira não encontrada';
  END IF;

  UPDATE public.resellers
  SET parent_id = p_sponsor_reseller_id, updated_at = now()
  WHERE id = p_reseller_id;

  PERFORM public.write_audit_log(
    'reseller_sponsor_corrected',
    'resellers',
    p_reseller_id::text,
    jsonb_build_object('parent_id', v_old),
    jsonb_build_object('parent_id', p_sponsor_reseller_id),
    jsonb_build_object('reason', p_reason, 'actor', v_actor)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'reseller_id', p_reseller_id,
    'parent_id', p_sponsor_reseller_id,
    'previous_parent_id', v_old
  );
END;
$$;

-- Raiz apenas por fluxo administrativo (sem patrocinadora)
CREATE OR REPLACE FUNCTION public.admin_create_root_reseller(
  p_user_id uuid,
  p_reseller_name text,
  p_store_name text,
  p_store_slug text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo para criar usuário raiz';
  END IF;

  -- Reutiliza grant com sponsor null (raiz)
  v_result := public.admin_grant_reseller_role(
    p_user_id,
    p_reseller_name,
    p_store_name,
    p_store_slug,
    NULL,
    p_reason
  );

  PERFORM public.write_audit_log(
    'reseller_root_created',
    'resellers',
    COALESCE(v_result->>'reseller_id', p_user_id::text),
    NULL,
    v_result,
    jsonb_build_object('reason', p_reason, 'actor', v_actor)
  );

  RETURN v_result || jsonb_build_object('root', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_regenerate_referral_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_reseller_sponsor(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_root_reseller(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_referral_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_reseller_sponsor(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_root_reseller(uuid, text, text, text, text) TO authenticated;

-- Sacoleira vê o próprio referral_code via SELECT RLS existente em resellers
COMMENT ON COLUMN public.resellers.referral_code IS
  'Código de indicação compartilhável (UPPER). Fonte oficial junto com parent_id.';
COMMENT ON FUNCTION public.validate_referral_code(text, text) IS
  'Valida código público. Não retorna e-mail/telefone da patrocinadora.';
COMMENT ON FUNCTION public.register_reseller_with_referral(text, text, text, text, text, text) IS
  'Cadastro de sacoleira com indicação obrigatória (revalida no servidor).';
