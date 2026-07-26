-- =============================================================================
-- Amada Amante — Persistência de consentimentos LGPD
-- Integra create_public_order com validação transacional de termos
-- NÃO altera regras de estoque/preço/comissões/saques/devoluções
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Config de pepper (somente DEFINER lê; sem grant a anon/authenticated)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_privacy_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hash_pepper text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.legal_privacy_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.legal_privacy_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.legal_privacy_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.legal_privacy_config TO service_role;

-- -----------------------------------------------------------------------------
-- legal_documents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN (
    'privacy_policy', 'terms_of_use', 'returns_policy',
    'delivery_policy', 'commission_policy', 'withdrawal_policy'
  )),
  title text NOT NULL,
  version text NOT NULL CHECK (length(trim(version)) > 0),
  content_hash text NOT NULL CHECK (length(trim(content_hash)) > 0),
  effective_at timestamptz NOT NULL,
  published_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  requires_acceptance boolean NOT NULL DEFAULT true,
  audience text NOT NULL CHECK (audience IN ('public', 'customer', 'reseller', 'admin')),
  route_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_documents_version_unique UNIQUE (document_type, audience, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_legal_documents_one_active
  ON public.legal_documents (document_type, audience)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_legal_documents_type_audience_active
  ON public.legal_documents (document_type, audience, is_active);
CREATE INDEX IF NOT EXISTS idx_legal_documents_version
  ON public.legal_documents (version);

DROP TRIGGER IF EXISTS trg_legal_documents_updated ON public.legal_documents;
CREATE TRIGGER trg_legal_documents_updated
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.protect_legal_document_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.published_at IS NOT NULL
     AND NEW.content_hash IS DISTINCT FROM OLD.content_hash THEN
    RAISE EXCEPTION 'content_hash de documento publicado não pode ser alterado';
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.published_at IS NOT NULL
     AND NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'version de documento publicado não pode ser alterada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_legal_document_hash ON public.legal_documents;
CREATE TRIGGER trg_protect_legal_document_hash
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_legal_document_hash();

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_documents_select_active_public" ON public.legal_documents;
CREATE POLICY "legal_documents_select_active_public"
  ON public.legal_documents FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND audience IN ('public', 'customer')
  );

DROP POLICY IF EXISTS "legal_documents_select_auth_extra" ON public.legal_documents;
CREATE POLICY "legal_documents_select_auth_extra"
  ON public.legal_documents FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      is_active = true
      AND audience IN ('reseller', 'admin', 'public', 'customer')
    )
  );

REVOKE ALL ON TABLE public.legal_documents FROM PUBLIC;
GRANT SELECT ON TABLE public.legal_documents TO anon, authenticated;
GRANT ALL ON TABLE public.legal_documents TO service_role;

-- -----------------------------------------------------------------------------
-- legal_consents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id uuid NOT NULL REFERENCES public.legal_documents(id),
  document_type text NOT NULL,
  document_version text NOT NULL,
  content_hash text NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('customer', 'reseller', 'admin')),
  subject_user_id uuid REFERENCES auth.users(id),
  reseller_id uuid REFERENCES public.resellers(id),
  customer_identifier_hash text,
  order_id uuid REFERENCES public.orders(id),
  store_id uuid REFERENCES public.seller_stores(id),
  consent_context text NOT NULL CHECK (consent_context IN (
    'checkout', 'registration', 'login', 'withdrawal_request',
    'commission_enrollment', 'manual'
  )),
  consent_source text NOT NULL CHECK (consent_source IN (
    'checkbox', 'authenticated_action', 'admin_record', 'migration'
  )),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revocation_reason text,
  ip_hash text,
  user_agent_hash text,
  session_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_consents_revoked_after_accepted CHECK (
    revoked_at IS NULL OR revoked_at >= accepted_at
  ),
  CONSTRAINT legal_consents_checkout_order CHECK (
    consent_context <> 'checkout' OR order_id IS NOT NULL
  ),
  CONSTRAINT legal_consents_reseller_id CHECK (
    subject_type <> 'reseller' OR reseller_id IS NOT NULL
  ),
  CONSTRAINT legal_consents_auth_user CHECK (
    subject_type = 'customer' OR subject_user_id IS NOT NULL
  ),
  CONSTRAINT legal_consents_customer_id CHECK (
    subject_type <> 'customer'
    OR subject_user_id IS NOT NULL
    OR customer_identifier_hash IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_legal_consent_checkout_doc
  ON public.legal_consents (order_id, document_type, document_version)
  WHERE consent_context = 'checkout' AND revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_legal_consent_auth_active
  ON public.legal_consents (subject_user_id, document_type, document_version, consent_context)
  WHERE subject_user_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_legal_consents_subject_user
  ON public.legal_consents (subject_user_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_reseller
  ON public.legal_consents (reseller_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_order
  ON public.legal_consents (order_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_store
  ON public.legal_consents (store_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_doc_version
  ON public.legal_consents (document_type, document_version);
CREATE INDEX IF NOT EXISTS idx_legal_consents_accepted_at
  ON public.legal_consents (accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_consents_active_subject_doc
  ON public.legal_consents (subject_type, document_type)
  WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS trg_legal_consents_updated ON public.legal_consents;
CREATE TRIGGER trg_legal_consents_updated
  BEFORE UPDATE ON public.legal_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_consents_select_own" ON public.legal_consents;
CREATE POLICY "legal_consents_select_own"
  ON public.legal_consents FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR subject_user_id = auth.uid()
    OR (reseller_id IS NOT NULL AND public.owns_reseller(reseller_id))
  );

REVOKE ALL ON TABLE public.legal_consents FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.legal_consents TO authenticated;
GRANT ALL ON TABLE public.legal_consents TO service_role;

-- -----------------------------------------------------------------------------
-- Auditoria de documentos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_document_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id uuid REFERENCES public.legal_documents(id),
  action text NOT NULL,
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_doc_audit_doc
  ON public.legal_document_audit_log (legal_document_id, created_at DESC);

ALTER TABLE public.legal_document_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_doc_audit_admin" ON public.legal_document_audit_log;
CREATE POLICY "legal_doc_audit_admin"
  ON public.legal_document_audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE ALL ON TABLE public.legal_document_audit_log FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.legal_document_audit_log TO authenticated;
GRANT ALL ON TABLE public.legal_document_audit_log TO service_role;

-- -----------------------------------------------------------------------------
-- Helpers de hash (internos: sem execute para anon/authenticated)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._legal_pepper()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hash_pepper FROM public.legal_privacy_config WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public._legal_pepper() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._legal_pepper() TO service_role;

CREATE OR REPLACE FUNCTION public._legal_hash(p_value text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pepper text;
BEGIN
  IF p_value IS NULL OR length(trim(p_value)) = 0 THEN
    RETURN NULL;
  END IF;
  v_pepper := public._legal_pepper();
  RETURN encode(sha256(convert_to(v_pepper || '|' || trim(p_value), 'UTF8')), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public._legal_hash(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._legal_hash(text) TO service_role;

CREATE OR REPLACE FUNCTION public._legal_content_fingerprint(
  p_type text, p_version text, p_title text, p_route text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(
    sha256(
      convert_to(
        trim(p_type) || '|' || trim(p_version) || '|' || trim(p_title) || '|' || trim(COALESCE(p_route, '')),
        'UTF8'
      )
    ),
    'hex'
  );
$$;

REVOKE ALL ON FUNCTION public._legal_content_fingerprint(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._legal_content_fingerprint(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public._log_legal_doc_audit(
  p_doc_id uuid, p_action text, p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.legal_document_audit_log (legal_document_id, action, actor_user_id, metadata)
  VALUES (p_doc_id, p_action, auth.uid(), COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public._log_legal_doc_audit(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._log_legal_doc_audit(uuid, text, jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- Seed documentos iniciais (idempotente por type+audience+version)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_hash text;
  v_id uuid;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('privacy_policy', 'Política de Privacidade', '2026-07-26', '/politica-de-privacidade', 'customer', true),
      ('terms_of_use', 'Termos de Uso', '2026-07-26', '/termos-de-uso', 'customer', true),
      ('returns_policy', 'Trocas e Devoluções', '2026-07-26', '/trocas-e-devolucoes', 'customer', true),
      ('delivery_policy', 'Política de Entrega', '2026-07-26', '/politica-de-entrega', 'customer', true),
      ('commission_policy', 'Política de Comissões', '2026-07-26', '/politica-de-comissoes', 'reseller', true),
      ('withdrawal_policy', 'Política de Saques', '2026-07-26', '/politica-de-saques', 'reseller', true),
      ('privacy_policy', 'Política de Privacidade', '2026-07-26', '/politica-de-privacidade', 'public', true),
      ('terms_of_use', 'Termos de Uso', '2026-07-26', '/termos-de-uso', 'public', true)
    ) AS t(document_type, title, version, route_path, audience, requires_acceptance)
  LOOP
    v_hash := public._legal_content_fingerprint(r.document_type, r.version, r.title, r.route_path);

    INSERT INTO public.legal_documents (
      document_type, title, version, content_hash, effective_at, published_at,
      is_active, requires_acceptance, audience, route_path
    ) VALUES (
      r.document_type, r.title, r.version, v_hash, timestamptz '2026-07-26', now(),
      true, r.requires_acceptance, r.audience, r.route_path
    )
    ON CONFLICT (document_type, audience, version) DO UPDATE
      SET title = EXCLUDED.title,
          route_path = EXCLUDED.route_path,
          requires_acceptance = EXCLUDED.requires_acceptance,
          updated_at = now()
    RETURNING id INTO v_id;

    UPDATE public.legal_documents
    SET is_active = false, updated_at = now()
    WHERE document_type = r.document_type
      AND audience = r.audience
      AND version <> r.version
      AND is_active = true;

    UPDATE public.legal_documents
    SET is_active = true, published_at = COALESCE(published_at, now()), updated_at = now()
    WHERE document_type = r.document_type
      AND audience = r.audience
      AND version = r.version;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- get_active_legal_documents
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_legal_documents(
  p_audience text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_aud text := NULLIF(trim(COALESCE(p_audience, '')), '');
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.document_type), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      id, document_type, title, version, content_hash,
      effective_at, route_path, requires_acceptance, audience
    FROM public.legal_documents
    WHERE is_active = true
      AND (
        v_aud IS NULL
        OR audience = v_aud
        OR (v_aud = 'checkout' AND audience IN ('public', 'customer'))
      )
      AND (
        auth.uid() IS NOT NULL
        OR audience IN ('public', 'customer')
      )
  ) x;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_legal_documents(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_legal_documents(text)
  TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- validate_checkout_consents (pré-validação)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_checkout_consents(p_consents jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required text[] := ARRAY[
    'privacy_policy', 'terms_of_use', 'returns_policy', 'delivery_policy'
  ];
  v_type text;
  v_entry jsonb;
  v_doc public.legal_documents%ROWTYPE;
  v_found int;
BEGIN
  IF p_consents IS NULL OR jsonb_typeof(p_consents) <> 'array' THEN
    RAISE EXCEPTION 'Consentimentos inválidos';
  END IF;

  FOREACH v_type IN ARRAY v_required LOOP
    SELECT e INTO v_entry
    FROM jsonb_array_elements(p_consents) e
    WHERE e->>'document_type' = v_type
      AND (e->>'accepted')::boolean IS TRUE
    LIMIT 1;

    IF v_entry IS NULL THEN
      RAISE EXCEPTION 'Termo obrigatório não aceito: %', v_type;
    END IF;

    SELECT * INTO v_doc
    FROM public.legal_documents
    WHERE document_type = v_type
      AND is_active = true
      AND audience IN ('customer', 'public')
      AND requires_acceptance = true
    ORDER BY CASE audience WHEN 'customer' THEN 0 ELSE 1 END
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Documento ativo não encontrado: %', v_type;
    END IF;

    IF (v_entry->>'version') IS DISTINCT FROM v_doc.version THEN
      RAISE EXCEPTION 'Os termos foram atualizados. Revise e aceite novamente.';
    END IF;
    IF (v_entry->>'content_hash') IS DISTINCT FROM v_doc.content_hash THEN
      RAISE EXCEPTION 'Os termos foram atualizados. Revise e aceite novamente.';
    END IF;
  END LOOP;

  SELECT count(*) INTO v_found
  FROM jsonb_array_elements(p_consents) e
  WHERE e->>'document_type' NOT IN (
    'privacy_policy','terms_of_use','returns_policy','delivery_policy',
    'commission_policy','withdrawal_policy'
  );
  IF v_found > 0 THEN
    RAISE EXCEPTION 'Documento desconhecido no consentimento';
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_checkout_consents(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_checkout_consents(jsonb)
  TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Gravação interna de consentimentos de checkout (idempotente)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._record_checkout_consents_internal(
  p_order_id uuid,
  p_store_id uuid,
  p_customer_identifier text,
  p_consents jsonb,
  p_session_reference text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry jsonb;
  v_doc public.legal_documents%ROWTYPE;
  v_type text;
  v_cust_hash text;
  v_ip_hash text;
  v_ua_hash text;
  v_required text[] := ARRAY[
    'privacy_policy', 'terms_of_use', 'returns_policy', 'delivery_policy'
  ];
BEGIN
  PERFORM public.validate_checkout_consents(p_consents);

  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.seller_store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'Pedido/loja inválidos para consentimento';
  END IF;

  v_cust_hash := public._legal_hash(p_customer_identifier);
  IF v_cust_hash IS NULL THEN
    RAISE EXCEPTION 'Identificador do cliente obrigatório para consentimento';
  END IF;
  v_ip_hash := public._legal_hash(p_ip);
  v_ua_hash := public._legal_hash(p_user_agent);

  FOREACH v_type IN ARRAY v_required LOOP
    SELECT e INTO v_entry
    FROM jsonb_array_elements(p_consents) e
    WHERE e->>'document_type' = v_type
      AND (e->>'accepted')::boolean IS TRUE
    LIMIT 1;

    SELECT * INTO v_doc
    FROM public.legal_documents
    WHERE document_type = v_type
      AND is_active = true
      AND audience IN ('customer', 'public')
      AND requires_acceptance = true
    ORDER BY CASE audience WHEN 'customer' THEN 0 ELSE 1 END
    LIMIT 1;

    INSERT INTO public.legal_consents (
      legal_document_id, document_type, document_version, content_hash,
      subject_type, customer_identifier_hash, order_id, store_id,
      consent_context, consent_source, accepted_at,
      ip_hash, user_agent_hash, session_reference, metadata
    ) VALUES (
      v_doc.id, v_doc.document_type, v_doc.version, v_doc.content_hash,
      'customer', v_cust_hash, p_order_id, p_store_id,
      'checkout', 'checkbox', now(),
      v_ip_hash, v_ua_hash, NULLIF(trim(COALESCE(p_session_reference, '')), ''),
      jsonb_build_object('accepted', true)
    )
    ON CONFLICT (order_id, document_type, document_version)
      WHERE consent_context = 'checkout' AND revoked_at IS NULL
    DO NOTHING;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public._record_checkout_consents_internal(uuid, uuid, text, jsonb, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._record_checkout_consents_internal(uuid, uuid, text, jsonb, text, text, text) TO service_role;

-- record_checkout_consents (uso administrativo/service_role e testes)
CREATE OR REPLACE FUNCTION public.record_checkout_consents(
  p_order_id uuid,
  p_store_id uuid,
  p_customer_identifier text,
  p_consents jsonb,
  p_session_reference text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND (auth.uid() IS NULL OR NOT public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  PERFORM public._record_checkout_consents_internal(
    p_order_id, p_store_id, p_customer_identifier, p_consents,
    p_session_reference, p_ip, p_user_agent
  );
  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_checkout_consents(uuid, uuid, text, jsonb, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_checkout_consents(uuid, uuid, text, jsonb, text, text, text)
  TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Integra create_public_order com p_consents (transação única)
-- Remove overloads antigas para evitar ambiguidade de assinatura no PostgREST.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_public_order(uuid, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.create_public_order(uuid, text, text, text, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.create_public_order(
  p_seller_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_checkout_token uuid DEFAULT NULL,
  p_consents jsonb DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  status public.order_status,
  subtotal numeric,
  total numeric,
  created_at timestamptz,
  items jsonb,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_ok boolean;
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_created_at timestamptz;
  v_status public.order_status := 'new'::public.order_status;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_product_name text;
  v_unit_price numeric(10,2);
  v_line_total numeric(10,2);
  v_product_status public.product_status;
  v_link_active boolean;
  v_dup_count integer;
  v_stock integer;
  v_stock_after integer;
  v_min_order integer;
  v_expires_at timestamptz;
  v_expired_at timestamptz;
  v_reserve_minutes integer;
  c_max_qty_per_item constant integer := 99;
  c_max_distinct_items constant integer := 50;
BEGIN
  IF p_checkout_token IS NULL THEN
    RAISE EXCEPTION 'checkout_token é obrigatório';
  END IF;

  IF p_seller_store_id IS NULL THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  IF length(trim(COALESCE(p_customer_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Nome do cliente inválido';
  END IF;

  IF length(trim(COALESCE(p_customer_phone, ''))) < 8 THEN
    RAISE EXCEPTION 'Telefone do cliente inválido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_checkout_token::text));

  SELECT o.id, o.status, o.subtotal, o.total, o.created_at, o.expires_at, o.expired_at
    INTO v_order_id, v_status, v_subtotal, v_total, v_created_at, v_expires_at, v_expired_at
  FROM public.orders o
  WHERE o.checkout_token = p_checkout_token;

  IF FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders o2
      WHERE o2.id = v_order_id AND o2.seller_store_id = p_seller_store_id
    ) THEN
      RAISE EXCEPTION 'checkout_token inválido para esta loja';
    END IF;

    IF v_status IN ('new'::public.order_status, 'confirmed'::public.order_status)
       AND v_expired_at IS NULL
       AND (v_expires_at IS NULL OR v_expires_at > now()) THEN
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total', oi.total
          )
          ORDER BY oi.created_at, oi.id
        ),
        '[]'::jsonb
      )
      INTO v_items
      FROM public.order_items oi
      WHERE oi.order_id = v_order_id;

      RETURN QUERY
      SELECT v_order_id, v_status, v_subtotal, v_total, v_created_at, v_items, v_expires_at;
      RETURN;
    END IF;

    RAISE EXCEPTION
      'checkout_token já utilizado em pedido encerrado ou com reserva expirada. Gere um novo token e tente novamente.';
  END IF;

  -- Validação LGPD antes de reservar estoque
  IF p_consents IS NULL THEN
    RAISE EXCEPTION 'Consentimentos legais são obrigatórios no checkout';
  END IF;
  PERFORM public.validate_checkout_consents(p_consents);

  SELECT public.is_approved_store(p_seller_store_id) INTO v_store_ok;
  IF NOT COALESCE(v_store_ok, false) THEN
    RAISE EXCEPTION 'Loja indisponível';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Itens inválidos';
  END IF;

  CREATE TEMP TABLE tmp_public_order_items (
    product_id uuid PRIMARY KEY,
    quantity integer NOT NULL CHECK (quantity > 0),
    product_name text,
    unit_price numeric(10,2),
    line_total numeric(10,2)
  ) ON COMMIT DROP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF v_item ? 'unit_price' OR v_item ? 'price' OR v_item ? 'total'
       OR v_item ? 'subtotal' OR v_item ? 'cost_price' OR v_item ? 'wholesale_price' THEN
      RAISE EXCEPTION 'Itens não podem enviar preços';
    END IF;

    BEGIN
      v_product_id := (v_item ->> 'product_id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'product_id inválido';
    END;

    BEGIN
      v_qty := (v_item ->> 'quantity')::integer;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'quantity inválida';
    END;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'quantity deve ser positiva';
    END IF;

    INSERT INTO tmp_public_order_items (product_id, quantity)
    VALUES (v_product_id, v_qty)
    ON CONFLICT (product_id) DO UPDATE
      SET quantity = tmp_public_order_items.quantity + EXCLUDED.quantity;
  END LOOP;

  SELECT count(*)::integer INTO v_dup_count FROM tmp_public_order_items;
  IF v_dup_count = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio';
  END IF;
  IF v_dup_count > c_max_distinct_items THEN
    RAISE EXCEPTION 'Demasiados itens distintos';
  END IF;

  v_reserve_minutes := public.get_order_reserve_minutes();
  v_expires_at := now() + make_interval(mins => v_reserve_minutes);

  FOR v_product_id, v_qty IN
    SELECT t.product_id, t.quantity
    FROM tmp_public_order_items t
    ORDER BY t.product_id
  LOOP
    IF v_qty > c_max_qty_per_item THEN
      RAISE EXCEPTION 'Quantidade excede o máximo permitido';
    END IF;

    SELECT p.name, p.status, p.stock, p.min_order, sp.active,
           COALESCE(sp.resale_price, p.suggested_price)
      INTO v_product_name, v_product_status, v_stock, v_min_order, v_link_active, v_unit_price
    FROM public.products p
    INNER JOIN public.store_products sp
      ON sp.product_id = p.id
     AND sp.seller_store_id = p_seller_store_id
    WHERE p.id = v_product_id
    FOR UPDATE OF p;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto indisponível nesta loja';
    END IF;

    IF v_product_status IS DISTINCT FROM 'active'::public.product_status THEN
      RAISE EXCEPTION 'Produto "%" está inativo', v_product_name;
    END IF;

    IF COALESCE(v_link_active, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Produto "%" não está liberado nesta loja', v_product_name;
    END IF;

    IF v_min_order IS NOT NULL AND v_qty < v_min_order THEN
      RAISE EXCEPTION 'Quantidade mínima para "%" é %', v_product_name, v_min_order;
    END IF;

    IF v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'Preço inválido para "%"', v_product_name;
    END IF;

    IF v_stock IS NULL OR v_stock < v_qty THEN
      RAISE EXCEPTION 'Estoque insuficiente para "%" (disponível: %)', v_product_name, COALESCE(v_stock, 0);
    END IF;

    v_line_total := round(v_unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;

    UPDATE tmp_public_order_items
    SET product_name = v_product_name,
        unit_price = v_unit_price,
        line_total = v_line_total
    WHERE product_id = v_product_id;
  END LOOP;

  v_total := v_subtotal;

  BEGIN
    INSERT INTO public.orders (
      seller_store_id, customer_name, customer_phone, customer_address, notes,
      subtotal, discount, total, status, origin, checkout_token, expires_at
    ) VALUES (
      p_seller_store_id, trim(p_customer_name), trim(p_customer_phone),
      NULLIF(trim(COALESCE(p_customer_address, '')), ''),
      NULLIF(trim(COALESCE(p_notes, '')), ''),
      v_subtotal, 0, v_total, 'new'::public.order_status,
      'loja_online'::public.order_origin, p_checkout_token, v_expires_at
    )
    RETURNING id, orders.status, orders.subtotal, orders.total, orders.created_at, orders.expires_at
    INTO v_order_id, v_status, v_subtotal, v_total, v_created_at, v_expires_at;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT o.id, o.status, o.subtotal, o.total, o.created_at, o.expires_at, o.expired_at
        INTO v_order_id, v_status, v_subtotal, v_total, v_created_at, v_expires_at, v_expired_at
      FROM public.orders o
      WHERE o.checkout_token = p_checkout_token
        AND o.seller_store_id = p_seller_store_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'checkout_token em conflito ou inválido para esta loja';
      END IF;

      IF v_status IN ('new'::public.order_status, 'confirmed'::public.order_status)
         AND v_expired_at IS NULL
         AND (v_expires_at IS NULL OR v_expires_at > now()) THEN
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'product_id', oi.product_id,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total', oi.total
            )
            ORDER BY oi.created_at, oi.id
          ),
          '[]'::jsonb
        )
        INTO v_items
        FROM public.order_items oi
        WHERE oi.order_id = v_order_id;

        RETURN QUERY
        SELECT v_order_id, v_status, v_subtotal, v_total, v_created_at, v_items, v_expires_at;
        RETURN;
      END IF;

      RAISE EXCEPTION
        'checkout_token já utilizado em pedido encerrado ou com reserva expirada. Gere um novo token e tente novamente.';
  END;

  FOR v_product_id, v_qty, v_product_name, v_unit_price, v_line_total IN
    SELECT t.product_id, t.quantity, t.product_name, t.unit_price, t.line_total
    FROM tmp_public_order_items t
    ORDER BY t.product_id
  LOOP
    SELECT stock INTO v_stock
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'Estoque insuficiente para "%" (corrida)', v_product_name;
    END IF;

    v_stock_after := v_stock - v_qty;

    UPDATE public.products
    SET stock = v_stock_after, updated_at = now()
    WHERE id = v_product_id;

    INSERT INTO public.stock_movements (
      product_id, seller_store_id, order_id, movement_type,
      quantity, quantity_before, quantity_after, performed_by, reason
    ) VALUES (
      v_product_id, p_seller_store_id, v_order_id, 'checkout_reserve',
      -v_qty, v_stock, v_stock_after, auth.uid(),
      'Baixa atômica no checkout público'
    );

    INSERT INTO public.order_items (
      order_id, seller_store_id, product_id, product_name, quantity, unit_price, total
    ) VALUES (
      v_order_id, p_seller_store_id, v_product_id, v_product_name, v_qty, v_unit_price, v_line_total
    );
  END LOOP;

  -- Consentimentos na mesma transação (falha => rollback do pedido/estoque)
  PERFORM public._record_checkout_consents_internal(
    v_order_id,
    p_seller_store_id,
    trim(p_customer_phone) || '|' || trim(p_customer_name),
    p_consents,
    p_checkout_token::text,
    NULL,
    NULL
  );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total', oi.total
      )
      ORDER BY oi.created_at, oi.id
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order_id;

  PERFORM public.write_audit_log(
    'create_public_order',
    'orders',
    v_order_id::text,
    NULL,
    jsonb_build_object(
      'seller_store_id', p_seller_store_id,
      'total', v_total,
      'item_count', v_dup_count,
      'expires_at', v_expires_at,
      'reserve_minutes', v_reserve_minutes,
      'legal_consents', true
    ),
    jsonb_build_object(
      'checkout_token_hash', md5(p_checkout_token::text),
      'source', 'create_public_order'
    )
  );

  RETURN QUERY
  SELECT v_order_id, v_status, v_subtotal, v_total, v_created_at, v_items, v_expires_at;
END;
$$;

COMMENT ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb, uuid, jsonb) IS
  'Checkout público atômico com expires_at + consentimentos LGPD (p_consents). Estoque/preço inalterados.';

REVOKE ALL ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb, uuid, jsonb)
  TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- record_authenticated_consent
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_authenticated_consent(
  p_document_type text,
  p_consent_context text,
  p_session_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.legal_documents%ROWTYPE;
  v_reseller_id uuid;
  v_subject text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_consent_context NOT IN (
    'registration', 'login', 'withdrawal_request', 'commission_enrollment', 'manual'
  ) THEN
    RAISE EXCEPTION 'Contexto de consentimento inválido';
  END IF;

  IF public.is_admin(auth.uid()) THEN
    v_subject := 'admin';
  ELSE
    v_subject := 'reseller';
    SELECT id INTO v_reseller_id FROM public.resellers WHERE user_id = auth.uid();
    IF v_reseller_id IS NULL THEN
      RAISE EXCEPTION 'Sacoleira não encontrada';
    END IF;
  END IF;

  SELECT * INTO v_doc
  FROM public.legal_documents
  WHERE document_type = p_document_type
    AND is_active = true
    AND requires_acceptance = true
    AND (
      (v_subject = 'reseller' AND audience IN ('reseller', 'public', 'customer'))
      OR (v_subject = 'admin' AND audience IN ('admin', 'public', 'reseller', 'customer'))
    )
  ORDER BY CASE audience
    WHEN 'reseller' THEN 0 WHEN 'admin' THEN 0 WHEN 'customer' THEN 1 ELSE 2
  END
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento ativo não encontrado';
  END IF;

  INSERT INTO public.legal_consents (
    legal_document_id, document_type, document_version, content_hash,
    subject_type, subject_user_id, reseller_id,
    consent_context, consent_source, accepted_at, session_reference
  ) VALUES (
    v_doc.id, v_doc.document_type, v_doc.version, v_doc.content_hash,
    v_subject, auth.uid(), v_reseller_id,
    p_consent_context, 'authenticated_action', now(),
    NULLIF(trim(COALESCE(p_session_reference, '')), '')
  )
  ON CONFLICT (subject_user_id, document_type, document_version, consent_context)
    WHERE subject_user_id IS NOT NULL AND revoked_at IS NULL
  DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.legal_consents
    WHERE subject_user_id = auth.uid()
      AND document_type = v_doc.document_type
      AND document_version = v_doc.version
      AND consent_context = p_consent_context
      AND revoked_at IS NULL
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'consent_id', v_id,
    'document_type', v_doc.document_type,
    'version', v_doc.version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_authenticated_consent(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_authenticated_consent(text, text, text)
  TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- get_my_consents
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_consents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.accepted_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      c.id,
      c.document_type,
      c.document_version AS version,
      c.consent_context,
      c.accepted_at,
      c.revoked_at,
      CASE WHEN c.revoked_at IS NULL THEN 'active' ELSE 'revoked' END AS status,
      d.route_path,
      d.title,
      d.is_active AS document_is_current_active,
      (d.is_active AND d.version = c.document_version) AS is_current_version
    FROM public.legal_consents c
    JOIN public.legal_documents d ON d.id = c.legal_document_id
    WHERE c.subject_user_id = auth.uid()
       OR (c.reseller_id IS NOT NULL AND public.owns_reseller(c.reseller_id))
  ) x;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_consents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_consents() TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- admin_list_legal_consents
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_legal_consents(
  p_document_type text DEFAULT NULL,
  p_version text DEFAULT NULL,
  p_subject_type text DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_context text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_total bigint;
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.legal_consents c
  WHERE (p_document_type IS NULL OR c.document_type = p_document_type)
    AND (p_version IS NULL OR c.document_version = p_version)
    AND (p_subject_type IS NULL OR c.subject_type = p_subject_type)
    AND (p_reseller_id IS NULL OR c.reseller_id = p_reseller_id)
    AND (p_order_id IS NULL OR c.order_id = p_order_id)
    AND (p_context IS NULL OR c.consent_context = p_context)
    AND (p_date_from IS NULL OR c.accepted_at >= p_date_from)
    AND (p_date_to IS NULL OR c.accepted_at <= p_date_to);

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.accepted_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      c.id, c.document_type, c.document_version AS version,
      c.subject_type, c.reseller_id, c.order_id, c.store_id,
      c.consent_context, c.consent_source, c.accepted_at, c.revoked_at,
      CASE WHEN c.revoked_at IS NULL THEN 'active' ELSE 'revoked' END AS status
    FROM public.legal_consents c
    WHERE (p_document_type IS NULL OR c.document_type = p_document_type)
      AND (p_version IS NULL OR c.document_version = p_version)
      AND (p_subject_type IS NULL OR c.subject_type = p_subject_type)
      AND (p_reseller_id IS NULL OR c.reseller_id = p_reseller_id)
      AND (p_order_id IS NULL OR c.order_id = p_order_id)
      AND (p_context IS NULL OR c.consent_context = p_context)
      AND (p_date_from IS NULL OR c.accepted_at >= p_date_from)
      AND (p_date_to IS NULL OR c.accepted_at <= p_date_to)
    ORDER BY c.accepted_at DESC
    OFFSET (v_page - 1) * v_size
    LIMIT v_size
  ) x;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'page', v_page, 'page_size', v_size);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_legal_consents(text, text, text, uuid, uuid, text, timestamptz, timestamptz, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_legal_consents(text, text, text, uuid, uuid, text, timestamptz, timestamptz, int, int)
  TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- publish_legal_document_version
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_legal_document_version(
  p_document_type text,
  p_title text,
  p_version text,
  p_content_hash text,
  p_effective_at timestamptz,
  p_audience text,
  p_route_path text,
  p_requires_acceptance boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  IF length(trim(COALESCE(p_version, ''))) = 0 THEN
    RAISE EXCEPTION 'Versão obrigatória';
  END IF;

  v_hash := NULLIF(trim(COALESCE(p_content_hash, '')), '');
  IF v_hash IS NULL THEN
    v_hash := public._legal_content_fingerprint(p_document_type, p_version, p_title, p_route_path);
  END IF;

  UPDATE public.legal_documents
  SET is_active = false, updated_at = now()
  WHERE document_type = p_document_type
    AND audience = p_audience
    AND is_active = true;

  INSERT INTO public.legal_documents (
    document_type, title, version, content_hash, effective_at, published_at,
    is_active, requires_acceptance, audience, route_path
  ) VALUES (
    p_document_type, trim(p_title), trim(p_version), v_hash,
    COALESCE(p_effective_at, now()), now(),
    true, COALESCE(p_requires_acceptance, true), p_audience, p_route_path
  )
  ON CONFLICT (document_type, audience, version) DO UPDATE
    SET title = EXCLUDED.title,
        is_active = true,
        requires_acceptance = EXCLUDED.requires_acceptance,
        route_path = EXCLUDED.route_path,
        effective_at = EXCLUDED.effective_at,
        published_at = COALESCE(public.legal_documents.published_at, now()),
        updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public._log_legal_doc_audit(
    v_id, 'publish_version',
    jsonb_build_object('document_type', p_document_type, 'version', p_version, 'audience', p_audience)
  );

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'version', trim(p_version), 'content_hash', v_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_legal_document_version(text, text, text, text, timestamptz, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_legal_document_version(text, text, text, text, timestamptz, text, text, boolean)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_legal_documents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.document_type, x.effective_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT id, document_type, title, version, content_hash, effective_at,
           published_at, is_active, requires_acceptance, audience, route_path
    FROM public.legal_documents
  ) x;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_legal_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_legal_documents() TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- revoke_legal_consent
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_legal_consent(
  p_consent_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.legal_consents%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Motivo da revogação é obrigatório';
  END IF;

  SELECT * INTO v_row FROM public.legal_consents WHERE id = p_consent_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consentimento não encontrado';
  END IF;

  IF v_row.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'status', 'revoked');
  END IF;

  IF v_row.consent_context = 'checkout' AND v_row.order_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Consentimento de checkout vinculado a pedido não pode ser revogado. Registre solicitação jurídica separadamente.';
  END IF;

  UPDATE public.legal_consents
  SET revoked_at = now(),
      revocation_reason = trim(p_reason),
      updated_at = now()
  WHERE id = p_consent_id;

  PERFORM public._log_legal_doc_audit(
    v_row.legal_document_id, 'revoke_consent',
    jsonb_build_object('consent_id', p_consent_id, 'reason', trim(p_reason))
  );

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'status', 'revoked');
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_legal_consent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_legal_consent(uuid, text)
  TO authenticated, service_role;

-- Helper: sacoleira tem aceite ativo da versão corrente?
CREATE OR REPLACE FUNCTION public.has_active_consent_for(
  p_document_type text,
  p_consent_context text DEFAULT 'manual'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.legal_documents%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_doc
  FROM public.legal_documents
  WHERE document_type = p_document_type
    AND is_active = true
    AND audience IN ('reseller', 'public', 'customer')
  ORDER BY CASE audience WHEN 'reseller' THEN 0 ELSE 1 END
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.legal_consents c
    WHERE c.subject_user_id = auth.uid()
      AND c.document_type = v_doc.document_type
      AND c.document_version = v_doc.version
      AND c.revoked_at IS NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.has_active_consent_for(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_consent_for(text, text)
  TO authenticated, service_role;