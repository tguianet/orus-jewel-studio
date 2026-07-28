-- =============================================================================
-- Campanhas globais de banner nas lojas (Amada Amante)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.global_store_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NULL,
  image_url text NOT NULL,
  mobile_image_url text NULL,
  button_text text NULL,
  button_url text NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_mandatory boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT global_store_banners_title_len CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  CONSTRAINT global_store_banners_image_url_len CHECK (char_length(trim(image_url)) BETWEEN 8 AND 2000),
  CONSTRAINT global_store_banners_period_check CHECK (
    starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at
  )
);

COMMENT ON TABLE public.global_store_banners IS
  'Campanhas oficiais de banner exibidas em todas as lojas aprovadas (nao copia para theme JSONB).';

CREATE INDEX IF NOT EXISTS global_store_banners_active_period_idx
  ON public.global_store_banners (is_active, position, created_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS global_store_banners_position_idx
  ON public.global_store_banners (position ASC, created_at ASC);

CREATE OR REPLACE FUNCTION public.trg_global_store_banners_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS global_store_banners_set_updated_at ON public.global_store_banners;
CREATE TRIGGER global_store_banners_set_updated_at
  BEFORE UPDATE ON public.global_store_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_global_store_banners_updated_at();

CREATE OR REPLACE FUNCTION public.is_safe_http_url(p_url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v text := lower(trim(COALESCE(p_url, '')));
BEGIN
  IF v = '' THEN
    RETURN true;
  END IF;
  IF v ~* '^(javascript|data|vbscript|file):' THEN
    RETURN false;
  END IF;
  RETURN v ~* '^https?://';
END;
$$;

ALTER TABLE public.global_store_banners
  DROP CONSTRAINT IF EXISTS global_store_banners_button_url_safe;
ALTER TABLE public.global_store_banners
  ADD CONSTRAINT global_store_banners_button_url_safe
  CHECK (public.is_safe_http_url(button_url));

ALTER TABLE public.global_store_banners
  DROP CONSTRAINT IF EXISTS global_store_banners_image_url_safe;
ALTER TABLE public.global_store_banners
  ADD CONSTRAINT global_store_banners_image_url_safe
  CHECK (public.is_safe_http_url(image_url) OR image_url LIKE '/%');

ALTER TABLE public.global_store_banners
  DROP CONSTRAINT IF EXISTS global_store_banners_mobile_image_url_safe;
ALTER TABLE public.global_store_banners
  ADD CONSTRAINT global_store_banners_mobile_image_url_safe
  CHECK (
    mobile_image_url IS NULL
    OR public.is_safe_http_url(mobile_image_url)
    OR mobile_image_url LIKE '/%'
  );

ALTER TABLE public.global_store_banners ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.global_store_banners FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Public can view active global store banners" ON public.global_store_banners;
CREATE POLICY "Public can view active global store banners"
ON public.global_store_banners
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at > now())
);

DROP POLICY IF EXISTS "Admins can select all global store banners" ON public.global_store_banners;
CREATE POLICY "Admins can select all global store banners"
ON public.global_store_banners
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

GRANT SELECT ON TABLE public.global_store_banners TO anon, authenticated;
GRANT ALL ON TABLE public.global_store_banners TO service_role;

-- ---------------------------------------------------------------------------
-- RPCs admin com audit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_global_store_banners()
RETURNS SETOF public.global_store_banners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  RETURN QUERY
  SELECT *
  FROM public.global_store_banners
  ORDER BY position ASC, created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_global_store_banners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_global_store_banners() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_upsert_global_store_banner(p_payload jsonb)
RETURNS public.global_store_banners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
  v_before jsonb;
  v_row public.global_store_banners;
  v_title text;
  v_image text;
  v_mobile text;
  v_btn_url text;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Apenas administradores podem gerenciar campanhas de banner';
  END IF;

  v_id := NULLIF(p_payload->>'id', '')::uuid;
  v_title := trim(COALESCE(p_payload->>'title', ''));
  v_image := trim(COALESCE(p_payload->>'image_url', ''));
  v_mobile := NULLIF(trim(COALESCE(p_payload->>'mobile_image_url', '')), '');
  v_btn_url := NULLIF(trim(COALESCE(p_payload->>'button_url', '')), '');

  IF v_title = '' THEN
    RAISE EXCEPTION 'Titulo e obrigatorio';
  END IF;
  IF v_image = '' THEN
    RAISE EXCEPTION 'Imagem e obrigatoria';
  END IF;
  IF NOT public.is_safe_http_url(v_image) AND v_image NOT LIKE '/%' THEN
    RAISE EXCEPTION 'URL da imagem invalida';
  END IF;
  IF v_mobile IS NOT NULL AND NOT public.is_safe_http_url(v_mobile) AND v_mobile NOT LIKE '/%' THEN
    RAISE EXCEPTION 'URL da imagem mobile invalida';
  END IF;
  IF v_btn_url IS NOT NULL AND NOT public.is_safe_http_url(v_btn_url) THEN
    RAISE EXCEPTION 'Link do botao invalido. Use http:// ou https://';
  END IF;

  IF v_id IS NOT NULL THEN
    SELECT to_jsonb(g) INTO v_before
    FROM public.global_store_banners g WHERE g.id = v_id;
    IF v_before IS NULL THEN
      RAISE EXCEPTION 'Campanha nao encontrada';
    END IF;

    UPDATE public.global_store_banners SET
      title = v_title,
      subtitle = NULLIF(trim(COALESCE(p_payload->>'subtitle', '')), ''),
      image_url = v_image,
      mobile_image_url = v_mobile,
      button_text = NULLIF(trim(COALESCE(p_payload->>'button_text', '')), ''),
      button_url = v_btn_url,
      is_active = COALESCE((p_payload->>'is_active')::boolean, is_active),
      is_mandatory = COALESCE((p_payload->>'is_mandatory')::boolean, true),
      position = COALESCE((p_payload->>'position')::integer, position),
      starts_at = NULLIF(p_payload->>'starts_at', '')::timestamptz,
      ends_at = NULLIF(p_payload->>'ends_at', '')::timestamptz,
      updated_by = v_actor
    WHERE id = v_id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.global_store_banners (
      title, subtitle, image_url, mobile_image_url, button_text, button_url,
      is_active, is_mandatory, position, starts_at, ends_at, created_by, updated_by
    ) VALUES (
      v_title,
      NULLIF(trim(COALESCE(p_payload->>'subtitle', '')), ''),
      v_image,
      v_mobile,
      NULLIF(trim(COALESCE(p_payload->>'button_text', '')), ''),
      v_btn_url,
      COALESCE((p_payload->>'is_active')::boolean, false),
      COALESCE((p_payload->>'is_mandatory')::boolean, true),
      COALESCE((p_payload->>'position')::integer, 0),
      NULLIF(p_payload->>'starts_at', '')::timestamptz,
      NULLIF(p_payload->>'ends_at', '')::timestamptz,
      v_actor,
      v_actor
    )
    RETURNING * INTO v_row;
  END IF;

  PERFORM public.write_audit_log(
    CASE WHEN v_id IS NULL THEN 'create_global_store_banner' ELSE 'update_global_store_banner' END,
    'global_store_banners',
    v_row.id::text,
    v_before,
    to_jsonb(v_row),
    jsonb_build_object(
      'source', 'admin_upsert_global_store_banner',
      'actor_id', v_actor,
      'updated_by', v_actor
    )
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_global_store_banner(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_global_store_banner(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_global_store_banner_active(
  p_id uuid,
  p_is_active boolean
)
RETURNS public.global_store_banners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_row public.global_store_banners;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;

  SELECT to_jsonb(g) INTO v_before FROM public.global_store_banners g WHERE g.id = p_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Campanha nao encontrada';
  END IF;

  UPDATE public.global_store_banners
  SET is_active = p_is_active, updated_by = v_actor
  WHERE id = p_id
  RETURNING * INTO v_row;

  PERFORM public.write_audit_log(
    CASE WHEN p_is_active THEN 'activate_global_store_banner' ELSE 'pause_global_store_banner' END,
    'global_store_banners',
    p_id::text,
    v_before,
    to_jsonb(v_row),
    jsonb_build_object('source', 'admin_set_global_store_banner_active', 'actor_id', v_actor)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_global_store_banner_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_global_store_banner_active(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_global_store_banner(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_before jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;

  SELECT to_jsonb(g) INTO v_before FROM public.global_store_banners g WHERE g.id = p_id;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Campanha nao encontrada';
  END IF;

  DELETE FROM public.global_store_banners WHERE id = p_id;

  PERFORM public.write_audit_log(
    'delete_global_store_banner',
    'global_store_banners',
    p_id::text,
    v_before,
    NULL,
    jsonb_build_object('source', 'admin_delete_global_store_banner', 'actor_id', v_actor)
  );

  RETURN jsonb_build_object('ok', true, 'id', p_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_global_store_banner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_global_store_banner(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_duplicate_global_store_banner(p_id uuid)
RETURNS public.global_store_banners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_src public.global_store_banners;
  v_row public.global_store_banners;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;

  SELECT * INTO v_src FROM public.global_store_banners WHERE id = p_id;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'Campanha nao encontrada';
  END IF;

  INSERT INTO public.global_store_banners (
    title, subtitle, image_url, mobile_image_url, button_text, button_url,
    is_active, is_mandatory, position, starts_at, ends_at, created_by, updated_by
  ) VALUES (
    v_src.title || ' (copia)',
    v_src.subtitle,
    v_src.image_url,
    v_src.mobile_image_url,
    v_src.button_text,
    v_src.button_url,
    false,
    v_src.is_mandatory,
    v_src.position + 1,
    v_src.starts_at,
    v_src.ends_at,
    v_actor,
    v_actor
  )
  RETURNING * INTO v_row;

  PERFORM public.write_audit_log(
    'duplicate_global_store_banner',
    'global_store_banners',
    v_row.id::text,
    to_jsonb(v_src),
    to_jsonb(v_row),
    jsonb_build_object('source', 'admin_duplicate_global_store_banner', 'actor_id', v_actor, 'from_id', p_id)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_duplicate_global_store_banner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_global_store_banner(uuid) TO authenticated, service_role;