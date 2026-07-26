-- =============================================================================
-- Migration 9 (adaptada): Código de indicação obrigatório
-- Diferença vs arquivo original: register_reseller_with_referral NÃO é criada
-- (fazia INSERT direto em auth.users/auth.identities — incompatível/inseguro).
-- =============================================================================

ALTER TABLE public.resellers ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.resellers ADD COLUMN IF NOT EXISTS can_receive_referrals boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.referral_code_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  code text NOT NULL,
  retired_at timestamptz NOT NULL DEFAULT now(),
  retired_by uuid,
  reason text
);
CREATE INDEX IF NOT EXISTS idx_referral_code_history_reseller ON public.referral_code_history (reseller_id, retired_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_code_history_code ON public.referral_code_history (code);

REVOKE ALL ON TABLE public.referral_code_history FROM PUBLIC;
REVOKE ALL ON TABLE public.referral_code_history FROM anon;
GRANT SELECT ON TABLE public.referral_code_history TO authenticated;
GRANT ALL ON TABLE public.referral_code_history TO service_role;
ALTER TABLE public.referral_code_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_referral_code_history" ON public.referral_code_history;
CREATE POLICY "admin_select_referral_code_history"
  ON public.referral_code_history FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.referral_validation_attempts (
  id bigserial PRIMARY KEY,
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_validation_attempts_key_created
  ON public.referral_validation_attempts (client_key, created_at DESC);
REVOKE ALL ON TABLE public.referral_validation_attempts FROM PUBLIC;
REVOKE ALL ON TABLE public.referral_validation_attempts FROM anon;
REVOKE ALL ON TABLE public.referral_validation_attempts FROM authenticated;
GRANT ALL ON TABLE public.referral_validation_attempts TO service_role;
ALTER TABLE public.referral_validation_attempts ENABLE ROW LEVEL SECURITY;

-- Helpers -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_referral_code(p_code text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(upper(regexp_replace(trim(COALESCE(p_code, '')), '\s+', '', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text; i int;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.resellers WHERE referral_code = result)
      AND NOT EXISTS (SELECT 1 FROM public.referral_code_history WHERE code = result);
  END LOOP;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC;

UPDATE public.resellers r
SET referral_code = public.generate_referral_code()
WHERE r.referral_code IS NULL OR trim(r.referral_code) = '';

ALTER TABLE public.resellers ALTER COLUMN referral_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resellers_referral_code_key') THEN
    ALTER TABLE public.resellers ADD CONSTRAINT resellers_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_resellers_assign_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL OR trim(NEW.referral_code) = '' THEN
    NEW.referral_code := public.generate_referral_code();
  ELSE
    NEW.referral_code := public.normalize_referral_code(NEW.referral_code);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_resellers_assign_referral_code ON public.resellers;
CREATE TRIGGER trg_resellers_assign_referral_code
  BEFORE INSERT OR UPDATE OF referral_code ON public.resellers
  FOR EACH ROW EXECUTE FUNCTION public.trg_resellers_assign_referral_code();

CREATE OR REPLACE FUNCTION public.would_create_reseller_cycle(p_reseller_id uuid, p_new_parent_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_walk uuid := p_new_parent_id; v_guard int := 0;
BEGIN
  IF p_reseller_id IS NULL OR p_new_parent_id IS NULL THEN RETURN false; END IF;
  IF p_reseller_id = p_new_parent_id THEN RETURN true; END IF;
  WHILE v_walk IS NOT NULL AND v_guard < 64 LOOP
    IF v_walk = p_reseller_id THEN RETURN true; END IF;
    SELECT parent_id INTO v_walk FROM public.resellers WHERE id = v_walk;
    v_guard := v_guard + 1;
  END LOOP;
  RETURN false;
END; $$;
REVOKE ALL ON FUNCTION public.would_create_reseller_cycle(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.would_create_reseller_cycle(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_referral_sponsor(p_code text)
RETURNS TABLE (sponsor_reseller_id uuid, sponsor_name text, store_name text, reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text := public.normalize_referral_code(p_code);
  v_uuid uuid; v_row public.resellers%ROWTYPE;
  v_store_name text; v_store_status public.seller_store_status;
BEGIN
  IF v_code IS NULL THEN
    sponsor_reseller_id := NULL; sponsor_name := NULL; store_name := NULL; reason := 'empty';
    RETURN NEXT; RETURN;
  END IF;

  BEGIN v_uuid := v_code::uuid; EXCEPTION WHEN invalid_text_representation THEN v_uuid := NULL; END;
  IF v_uuid IS NOT NULL THEN
    SELECT * INTO v_row FROM public.resellers WHERE id = v_uuid LIMIT 1;
  END IF;
  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.resellers WHERE referral_code = v_code LIMIT 1;
  END IF;

  IF v_row.id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.referral_code_history h WHERE h.code = v_code)
      THEN reason := 'inactive'; ELSE reason := 'not_found'; END IF;
    sponsor_reseller_id := NULL; sponsor_name := NULL; store_name := NULL;
    RETURN NEXT; RETURN;
  END IF;

  SELECT s.store_name, s.status INTO v_store_name, v_store_status
  FROM public.seller_stores s WHERE s.reseller_id = v_row.id
  ORDER BY s.created_at ASC LIMIT 1;

  IF v_row.status = 'blocked' OR v_store_status = 'blocked' THEN
    sponsor_reseller_id := NULL; sponsor_name := NULL; store_name := NULL; reason := 'blocked';
    RETURN NEXT; RETURN;
  END IF;
  IF v_row.status IS DISTINCT FROM 'approved' THEN
    sponsor_reseller_id := NULL; sponsor_name := NULL; store_name := NULL; reason := 'inactive';
    RETURN NEXT; RETURN;
  END IF;
  IF NOT COALESCE(v_row.can_receive_referrals, true) THEN
    sponsor_reseller_id := NULL; sponsor_name := NULL; store_name := NULL; reason := 'blocked';
    RETURN NEXT; RETURN;
  END IF;

  sponsor_reseller_id := v_row.id;
  sponsor_name := v_row.display_name;
  store_name := COALESCE(v_store_name, v_row.display_name);
  reason := 'ok';
  RETURN NEXT;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_referral_sponsor(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._referral_rate_limit_ok(p_client_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_key text := NULLIF(trim(COALESCE(p_client_key, '')), ''); v_count int;
BEGIN
  IF v_key IS NULL THEN v_key := coalesce(auth.uid()::text, 'anon'); END IF;
  DELETE FROM public.referral_validation_attempts WHERE created_at < now() - interval '1 day';
  INSERT INTO public.referral_validation_attempts (client_key) VALUES (v_key);
  SELECT count(*) INTO v_count FROM public.referral_validation_attempts
  WHERE client_key = v_key AND created_at > now() - interval '15 minutes';
  RETURN v_count <= 40;
END; $$;
REVOKE ALL ON FUNCTION public._referral_rate_limit_ok(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text, p_client_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sponsor record;
BEGIN
  IF NOT public._referral_rate_limit_ok(p_client_key) THEN
    RETURN jsonb_build_object('valid', false, 'sponsor_reseller_id', NULL, 'sponsor_name', NULL,
      'store_name', NULL, 'reason', 'rate_limited');
  END IF;
  SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(p_code) LIMIT 1;
  IF v_sponsor.reason = 'ok' THEN
    RETURN jsonb_build_object('valid', true, 'sponsor_reseller_id', v_sponsor.sponsor_reseller_id,
      'sponsor_name', v_sponsor.sponsor_name, 'store_name', v_sponsor.store_name, 'reason', 'ok');
  END IF;
  RETURN jsonb_build_object('valid', false, 'sponsor_reseller_id', NULL, 'sponsor_name', NULL,
    'store_name', NULL, 'reason', COALESCE(v_sponsor.reason, 'not_found'));
END; $$;
REVOKE ALL ON FUNCTION public.validate_referral_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text, text) TO anon, authenticated;

-- handle_new_user ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent_uuid uuid := NULL;
  parent_raw text := NULLIF(NEW.raw_user_meta_data ->> 'parent_reseller_id', '');
  referral_raw text := NULLIF(NEW.raw_user_meta_data ->> 'referral_code', '');
  display text := COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1), '');
  phone_text text := NEW.raw_user_meta_data ->> 'phone';
  base_slug text; final_slug text; i int := 0;
  reseller_uuid uuid; v_sponsor record; v_code text;
BEGIN
  v_code := COALESCE(referral_raw, parent_raw);
  IF v_code IS NOT NULL THEN
    SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(v_code) LIMIT 1;
    IF v_sponsor.reason = 'ok' THEN
      parent_uuid := v_sponsor.sponsor_reseller_id;
    ELSE
      RAISE EXCEPTION 'Código de indicação inválido (%)', v_sponsor.reason USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, display, phone_text) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sacoleira'::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.resellers (user_id, display_name, email, phone, parent_id, status)
  VALUES (NEW.id, display, NEW.email, phone_text, parent_uuid, 'pending')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO reseller_uuid;

  IF reseller_uuid IS NULL THEN
    SELECT id INTO reseller_uuid FROM public.resellers WHERE user_id = NEW.id LIMIT 1;
    IF parent_uuid IS NOT NULL THEN
      UPDATE public.resellers SET parent_id = parent_uuid, updated_at = now()
      WHERE id = reseller_uuid AND parent_id IS NULL;
    END IF;
  END IF;

  base_slug := regexp_replace(lower(coalesce(display, split_part(NEW.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'loja'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.seller_stores WHERE store_slug = final_slug) LOOP
    i := i + 1; final_slug := base_slug || '-' || i::text;
  END LOOP;

  INSERT INTO public.seller_stores (owner_user_id, reseller_id, store_name, store_slug, contact_phone, status, theme)
  SELECT NEW.id, reseller_uuid, COALESCE(display, 'Minha loja'), final_slug, phone_text,
    'pending'::public.seller_store_status,
    jsonb_build_object('primaryColor', '#d4a747', 'secondaryColor', '#f5e6c8')
  WHERE NOT EXISTS (SELECT 1 FROM public.seller_stores s WHERE s.owner_user_id = NEW.id);

  RETURN NEW;
END; $$;

-- Vínculo pós-login (obrigatório para quem entrou sem código) ------------------
CREATE OR REPLACE FUNCTION public.set_my_reseller_parent_by_code(p_referral_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE my_id uuid; my_parent uuid; v_sponsor record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT r.id, r.parent_id INTO my_id, my_parent FROM public.resellers r WHERE r.user_id = auth.uid() LIMIT 1;
  IF my_id IS NULL THEN RAISE EXCEPTION 'Perfil de sacoleira não encontrado'; END IF;
  IF my_parent IS NOT NULL THEN RAISE EXCEPTION 'Indicação já definida e não pode ser alterada'; END IF;

  SELECT * INTO v_sponsor FROM public.resolve_referral_sponsor(p_referral_code) LIMIT 1;
  IF v_sponsor.reason IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'Código de indicação inválido (%)', COALESCE(v_sponsor.reason, 'not_found');
  END IF;
  IF v_sponsor.sponsor_reseller_id = my_id THEN RAISE EXCEPTION 'Você não pode se indicar'; END IF;
  IF public.would_create_reseller_cycle(my_id, v_sponsor.sponsor_reseller_id) THEN
    RAISE EXCEPTION 'Esta indicação criaria um ciclo na rede';
  END IF;

  UPDATE public.resellers SET parent_id = v_sponsor.sponsor_reseller_id, updated_at = now() WHERE id = my_id;

  PERFORM public.write_audit_log('reseller_parent_set', 'resellers', my_id::text,
    jsonb_build_object('parent_id', NULL),
    jsonb_build_object('parent_id', v_sponsor.sponsor_reseller_id),
    jsonb_build_object('source', 'set_my_reseller_parent_by_code'));

  RETURN jsonb_build_object('ok', true, 'sponsor_reseller_id', v_sponsor.sponsor_reseller_id,
    'sponsor_name', v_sponsor.sponsor_name);
END; $$;
REVOKE ALL ON FUNCTION public.set_my_reseller_parent_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_reseller_parent_by_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_my_reseller_parent(_parent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE my_id uuid; my_parent uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT r.id, r.parent_id INTO my_id, my_parent FROM public.resellers r WHERE r.user_id = auth.uid() LIMIT 1;
  IF my_id IS NULL THEN RAISE EXCEPTION 'Perfil de sacoleira não encontrado'; END IF;
  IF my_parent IS NOT NULL THEN RAISE EXCEPTION 'Indicação já definida e não pode ser alterada'; END IF;
  IF _parent_id = my_id THEN RAISE EXCEPTION 'Você não pode se indicar'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.resellers r WHERE r.id = _parent_id AND r.status = 'approved'
    AND COALESCE(r.can_receive_referrals, true)) THEN
    RAISE EXCEPTION 'Indicação não encontrada ou inativa';
  END IF;
  IF EXISTS (SELECT 1 FROM public.seller_stores s WHERE s.reseller_id = _parent_id AND s.status = 'blocked') THEN
    RAISE EXCEPTION 'Indicação bloqueada';
  END IF;
  IF public.would_create_reseller_cycle(my_id, _parent_id) THEN
    RAISE EXCEPTION 'Esta indicação criaria um ciclo na rede';
  END IF;
  UPDATE public.resellers SET parent_id = _parent_id, updated_at = now() WHERE id = my_id;
END; $$;

-- Admin ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_regenerate_referral_code(p_reseller_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_old text; v_new text;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT referral_code INTO v_old FROM public.resellers WHERE id = p_reseller_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Sacoleira não encontrada'; END IF;
  v_new := public.generate_referral_code();
  INSERT INTO public.referral_code_history (reseller_id, code, retired_by, reason)
  VALUES (p_reseller_id, v_old, v_actor, COALESCE(NULLIF(trim(p_reason), ''), 'regenerate'));
  UPDATE public.resellers SET referral_code = v_new, updated_at = now() WHERE id = p_reseller_id;
  PERFORM public.write_audit_log('referral_code_regenerated', 'resellers', p_reseller_id::text,
    jsonb_build_object('referral_code', v_old), jsonb_build_object('referral_code', v_new),
    jsonb_build_object('reason', p_reason));
  RETURN jsonb_build_object('ok', true, 'referral_code', v_new, 'previous_code', v_old);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_reseller_sponsor(p_reseller_id uuid, p_sponsor_reseller_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_old uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'Informe o motivo da correção'; END IF;
  IF p_reseller_id IS NULL OR p_sponsor_reseller_id IS NULL THEN RAISE EXCEPTION 'Patrocinadora obrigatória'; END IF;
  IF p_reseller_id = p_sponsor_reseller_id THEN RAISE EXCEPTION 'Autoindicação não permitida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.resellers r WHERE r.id = p_sponsor_reseller_id AND r.status = 'approved') THEN
    RAISE EXCEPTION 'Patrocinadora inválida ou inativa';
  END IF;
  IF public.would_create_reseller_cycle(p_reseller_id, p_sponsor_reseller_id) THEN
    RAISE EXCEPTION 'Esta alteração criaria um ciclo na rede';
  END IF;
  SELECT parent_id INTO v_old FROM public.resellers WHERE id = p_reseller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sacoleira não encontrada'; END IF;
  UPDATE public.resellers SET parent_id = p_sponsor_reseller_id, updated_at = now() WHERE id = p_reseller_id;
  PERFORM public.write_audit_log('reseller_sponsor_corrected', 'resellers', p_reseller_id::text,
    jsonb_build_object('parent_id', v_old), jsonb_build_object('parent_id', p_sponsor_reseller_id),
    jsonb_build_object('reason', p_reason, 'actor', v_actor));
  RETURN jsonb_build_object('ok', true, 'reseller_id', p_reseller_id, 'parent_id', p_sponsor_reseller_id,
    'previous_parent_id', v_old);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_create_root_reseller(
  p_user_id uuid, p_reseller_name text, p_store_name text, p_store_slug text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo para criar usuário raiz';
  END IF;
  v_result := public.admin_grant_reseller_role(p_user_id, p_reseller_name, p_store_name, p_store_slug, NULL, p_reason);
  PERFORM public.write_audit_log('reseller_root_created', 'resellers',
    COALESCE(v_result->>'reseller_id', p_user_id::text), NULL, v_result,
    jsonb_build_object('reason', p_reason, 'actor', v_actor));
  RETURN v_result || jsonb_build_object('root', true);
END; $$;

REVOKE ALL ON FUNCTION public.admin_regenerate_referral_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_reseller_sponsor(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_root_reseller(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_referral_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_reseller_sponsor(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_root_reseller(uuid, text, text, text, text) TO authenticated;

COMMENT ON COLUMN public.resellers.referral_code IS
  'Código de indicação compartilhável (UPPER). Vínculo oficial continua em parent_id.';
COMMENT ON FUNCTION public.validate_referral_code(text, text) IS
  'Valida código público. Não retorna e-mail/telefone da patrocinadora.';