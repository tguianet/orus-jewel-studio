-- =============================================================================
-- Amada Amante — Módulo de saques das sacoleiras
-- Ledger: wallet_transactions (hold/release/paid) + withdrawal_requests
-- NÃO altera create_mlm_commissions_for_order / reverse_mlm / cancel/refund orders
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Settings (mínimo configurável)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  minimum_withdrawal_amount numeric(14,2) NOT NULL DEFAULT 50.00
    CHECK (minimum_withdrawal_amount > 0 AND scale(minimum_withdrawal_amount) <= 2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.withdrawal_settings (id, minimum_withdrawal_amount)
VALUES (1, 50.00)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.withdrawal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawal_settings_select_auth" ON public.withdrawal_settings;
CREATE POLICY "withdrawal_settings_select_auth"
  ON public.withdrawal_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "withdrawal_settings_no_direct_write" ON public.withdrawal_settings;

-- -----------------------------------------------------------------------------
-- 2) Perfil de recebimento
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reseller_payout_profiles (
  reseller_id uuid PRIMARY KEY REFERENCES public.resellers(id) ON DELETE CASCADE,
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'bank_transfer')),
  payment_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.reseller_payout_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_profiles_select_own_or_admin" ON public.reseller_payout_profiles;
CREATE POLICY "payout_profiles_select_own_or_admin"
  ON public.reseller_payout_profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.owns_reseller(reseller_id));

-- -----------------------------------------------------------------------------
-- 3) Solicitação de saque
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id),
  amount numeric(14,2) NOT NULL
    CHECK (amount > 0 AND scale(amount) <= 2),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'bank_transfer')),
  payment_details jsonb NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id),
  payment_reference text,
  receipt_url text,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  cancellation_reason text,
  request_idempotency_key text,
  payment_idempotency_key text,
  balance_released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT withdrawal_requests_reject_reason_chk
    CHECK (status <> 'rejected' OR (rejection_reason IS NOT NULL AND length(trim(rejection_reason)) > 0)),
  CONSTRAINT withdrawal_requests_paid_fields_chk
    CHECK (
      status <> 'paid'
      OR (paid_at IS NOT NULL AND paid_by IS NOT NULL)
    ),
  CONSTRAINT withdrawal_requests_receipt_url_chk
    CHECK (
      receipt_url IS NULL
      OR (
        receipt_url ~* '^https?://'
        AND receipt_url !~* '^javascript:'
        AND receipt_url !~* '^data:'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_reseller
  ON public.withdrawal_requests (reseller_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status
  ON public.withdrawal_requests (status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_at
  ON public.withdrawal_requests (requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_paid_at
  ON public.withdrawal_requests (paid_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_admin_filters
  ON public.withdrawal_requests (status, requested_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_withdrawal_request_idempotency
  ON public.withdrawal_requests (reseller_id, request_idempotency_key)
  WHERE request_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_withdrawal_payment_idempotency
  ON public.withdrawal_requests (payment_idempotency_key)
  WHERE payment_idempotency_key IS NOT NULL;

DROP TRIGGER IF EXISTS trg_withdrawal_requests_updated ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_requests_updated
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawals_select_own_or_admin" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_select_own_or_admin"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.owns_reseller(reseller_id));

REVOKE ALL ON TABLE public.withdrawal_requests FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.withdrawal_requests TO authenticated;
GRANT ALL ON TABLE public.withdrawal_requests TO service_role;

REVOKE ALL ON TABLE public.reseller_payout_profiles FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.reseller_payout_profiles TO authenticated;
GRANT ALL ON TABLE public.reseller_payout_profiles TO service_role;

REVOKE ALL ON TABLE public.withdrawal_settings FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.withdrawal_settings TO authenticated;
GRANT ALL ON TABLE public.withdrawal_settings TO service_role;

-- -----------------------------------------------------------------------------
-- 4) Auditoria de saques
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL REFERENCES public.withdrawal_requests(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  actor_user_id uuid,
  actor_role text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_withdrawal
  ON public.withdrawal_audit_log (withdrawal_id, created_at DESC);

ALTER TABLE public.withdrawal_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawal_audit_select_own_or_admin" ON public.withdrawal_audit_log;
CREATE POLICY "withdrawal_audit_select_own_or_admin"
  ON public.withdrawal_audit_log FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.withdrawal_requests wr
      WHERE wr.id = withdrawal_id AND public.owns_reseller(wr.reseller_id)
    )
  );

REVOKE ALL ON TABLE public.withdrawal_audit_log FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.withdrawal_audit_log TO authenticated;
GRANT ALL ON TABLE public.withdrawal_audit_log TO service_role;

-- -----------------------------------------------------------------------------
-- 5) Extender wallet_transactions
-- -----------------------------------------------------------------------------
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS withdrawal_id uuid REFERENCES public.withdrawal_requests(id);

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN (
    'commission',
    'commission_reversal',
    'withdrawal',
    'withdrawal_hold',
    'withdrawal_release',
    'withdrawal_paid',
    'adjustment'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS uidx_wallet_tx_withdrawal_type
  ON public.wallet_transactions (withdrawal_id, type)
  WHERE withdrawal_id IS NOT NULL
    AND type IN ('withdrawal_hold', 'withdrawal_release', 'withdrawal_paid');

CREATE INDEX IF NOT EXISTS idx_wallet_tx_withdrawal_id
  ON public.wallet_transactions (withdrawal_id)
  WHERE withdrawal_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6) View: available + blocked
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.reseller_wallet_summary
WITH (security_invoker = true) AS
SELECT
  wt.reseller_id,
  COALESCE(SUM(wt.amount) FILTER (WHERE wt.status = 'pending'), 0) AS pending,
  COALESCE(SUM(wt.amount) FILTER (WHERE wt.status = 'available'), 0) AS available,
  COALESCE(SUM(wt.amount) FILTER (WHERE wt.status = 'paid'), 0) AS paid,
  COALESCE(SUM(wt.amount) FILTER (WHERE wt.status IN ('pending', 'available')), 0) AS total_balance,
  COALESCE((
    SELECT SUM(wr.amount)
    FROM public.withdrawal_requests wr
    WHERE wr.reseller_id = wt.reseller_id
      AND wr.status IN ('pending', 'approved')
  ), 0) AS blocked
FROM public.wallet_transactions wt
GROUP BY wt.reseller_id;

GRANT SELECT ON public.reseller_wallet_summary TO authenticated;

-- -----------------------------------------------------------------------------
-- Helpers internos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._withdrawal_actor_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_admin(auth.uid()) THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'sacoleira'
    ) THEN 'sacoleira'
    ELSE 'unknown'
  END;
$$;

CREATE OR REPLACE FUNCTION public._log_withdrawal_audit(
  p_withdrawal_id uuid,
  p_action text,
  p_previous text,
  p_new text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.withdrawal_audit_log (
    withdrawal_id, action, previous_status, new_status,
    actor_user_id, actor_role, metadata
  ) VALUES (
    p_withdrawal_id, p_action, p_previous, p_new,
    auth.uid(), public._withdrawal_actor_role(), COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._validate_payment_details(
  p_method text,
  p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_details IS NULL OR jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'Dados de recebimento inválidos';
  END IF;

  IF COALESCE(nullif(trim(p_details->>'account_holder_name'), ''), '') = '' THEN
    RAISE EXCEPTION 'Nome do titular é obrigatório';
  END IF;
  IF COALESCE(nullif(trim(p_details->>'account_holder_document'), ''), '') = '' THEN
    RAISE EXCEPTION 'Documento do titular é obrigatório';
  END IF;

  IF p_method = 'pix' THEN
    IF COALESCE(p_details->>'pix_key_type', '') NOT IN ('cpf','cnpj','email','phone','random') THEN
      RAISE EXCEPTION 'Tipo de chave PIX inválido';
    END IF;
    IF COALESCE(nullif(trim(p_details->>'pix_key'), ''), '') = '' THEN
      RAISE EXCEPTION 'Chave PIX é obrigatória';
    END IF;
  ELSIF p_method = 'bank_transfer' THEN
    IF COALESCE(nullif(trim(p_details->>'bank_code'), ''), '') = ''
       AND COALESCE(nullif(trim(p_details->>'bank_name'), ''), '') = '' THEN
      RAISE EXCEPTION 'Banco é obrigatório';
    END IF;
    IF COALESCE(nullif(trim(p_details->>'agency'), ''), '') = '' THEN
      RAISE EXCEPTION 'Agência é obrigatória';
    END IF;
    IF COALESCE(nullif(trim(p_details->>'account_number'), ''), '') = '' THEN
      RAISE EXCEPTION 'Conta é obrigatória';
    END IF;
    IF COALESCE(p_details->>'account_type', '') NOT IN ('checking', 'savings', 'corrente', 'poupanca') THEN
      RAISE EXCEPTION 'Tipo de conta inválido';
    END IF;
  ELSE
    RAISE EXCEPTION 'Método de pagamento inválido';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._wallet_available_for_update(p_reseller_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available numeric(14,2);
BEGIN
  PERFORM 1 FROM public.resellers WHERE id = p_reseller_id FOR UPDATE;

  SELECT COALESCE(SUM(amount), 0)::numeric(14,2)
    INTO v_available
  FROM public.wallet_transactions
  WHERE reseller_id = p_reseller_id
    AND status = 'available';

  RETURN v_available;
END;
$$;

CREATE OR REPLACE FUNCTION public._is_safe_receipt_url(p_url text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_url IS NULL
    OR (
      p_url ~* '^https?://'
      AND p_url !~* 'javascript:'
      AND p_url !~* '^data:'
    );
$$;

-- -----------------------------------------------------------------------------
-- 7) upsert payout profile
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_my_payout_profile(
  p_payment_method text,
  p_payment_details jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO v_reseller_id
  FROM public.resellers
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF v_reseller_id IS NULL THEN
    RAISE EXCEPTION 'Sacoleira não encontrada';
  END IF;

  PERFORM public._validate_payment_details(p_payment_method, p_payment_details);

  INSERT INTO public.reseller_payout_profiles (reseller_id, payment_method, payment_details, updated_by)
  VALUES (v_reseller_id, p_payment_method, p_payment_details, auth.uid())
  ON CONFLICT (reseller_id) DO UPDATE SET
    payment_method = EXCLUDED.payment_method,
    payment_details = EXCLUDED.payment_details,
    updated_at = now(),
    updated_by = auth.uid();

  RETURN jsonb_build_object('ok', true, 'reseller_id', v_reseller_id);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_payout_profile(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_my_payout_profile(text, jsonb) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 8) request_withdrawal
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_payment_method text,
  p_payment_details jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller_id uuid;
  v_min numeric(14,2);
  v_available numeric(14,2);
  v_amount numeric(14,2);
  v_existing public.withdrawal_requests%ROWTYPE;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO v_reseller_id FROM public.resellers WHERE user_id = auth.uid();
  IF v_reseller_id IS NULL THEN
    RAISE EXCEPTION 'Sacoleira não encontrada';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_existing
    FROM public.withdrawal_requests
    WHERE reseller_id = v_reseller_id
      AND request_idempotency_key = trim(p_idempotency_key);
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'withdrawal_id', v_existing.id,
        'status', v_existing.status,
        'amount', v_existing.amount
      );
    END IF;
  END IF;

  IF p_amount IS NULL OR p_amount <> p_amount THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;
  v_amount := round(p_amount::numeric, 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;
  IF abs(p_amount::numeric - v_amount) > 0.001 THEN
    RAISE EXCEPTION 'Valor deve ter no máximo 2 casas decimais';
  END IF;

  SELECT minimum_withdrawal_amount INTO v_min FROM public.withdrawal_settings WHERE id = 1;
  IF v_amount < v_min THEN
    RAISE EXCEPTION 'Valor abaixo do mínimo de saque (%).', v_min;
  END IF;

  PERFORM public._validate_payment_details(p_payment_method, p_payment_details);

  v_available := public._wallet_available_for_update(v_reseller_id);
  IF v_available < v_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  INSERT INTO public.withdrawal_requests (
    reseller_id, amount, status, payment_method, payment_details, request_idempotency_key
  ) VALUES (
    v_reseller_id, v_amount, 'pending', p_payment_method, p_payment_details,
    NULLIF(trim(COALESCE(p_idempotency_key, '')), '')
  )
  RETURNING id INTO v_id;

  INSERT INTO public.wallet_transactions (
    reseller_id, type, amount, status, description, withdrawal_id
  ) VALUES (
    v_reseller_id,
    'withdrawal_hold',
    -v_amount,
    'available',
    'Saque solicitado — valor bloqueado',
    v_id
  );

  INSERT INTO public.reseller_payout_profiles (reseller_id, payment_method, payment_details, updated_by)
  VALUES (v_reseller_id, p_payment_method, p_payment_details, auth.uid())
  ON CONFLICT (reseller_id) DO UPDATE SET
    payment_method = EXCLUDED.payment_method,
    payment_details = EXCLUDED.payment_details,
    updated_at = now(),
    updated_by = auth.uid();

  PERFORM public._log_withdrawal_audit(
    v_id, 'request', NULL, 'pending',
    jsonb_build_object('amount', v_amount, 'payment_method', p_payment_method)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'withdrawal_id', v_id,
    'status', 'pending',
    'amount', v_amount,
    'available_after', v_available - v_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, jsonb, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Release hold (interno, uma vez)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._release_withdrawal_hold(
  p_withdrawal public.withdrawal_requests,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_withdrawal.balance_released THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE withdrawal_id = p_withdrawal.id AND type = 'withdrawal_release'
  ) THEN
    UPDATE public.withdrawal_requests
    SET balance_released = true, updated_at = now()
    WHERE id = p_withdrawal.id AND balance_released = false;
    RETURN;
  END IF;

  INSERT INTO public.wallet_transactions (
    reseller_id, type, amount, status, description, withdrawal_id
  ) VALUES (
    p_withdrawal.reseller_id,
    'withdrawal_release',
    p_withdrawal.amount,
    'available',
    CASE WHEN p_action = 'reject' THEN 'Saque rejeitado — saldo devolvido'
         ELSE 'Saque cancelado — saldo devolvido' END,
    p_withdrawal.id
  );

  UPDATE public.withdrawal_requests
  SET balance_released = true, updated_at = now()
  WHERE id = p_withdrawal.id
    AND balance_released = false;
END;
$$;

-- -----------------------------------------------------------------------------
-- 9) cancel_withdrawal (sacoleira, só pending)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_withdrawal(
  p_withdrawal_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.withdrawal_requests%ROWTYPE;
  v_reseller_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO v_reseller_id FROM public.resellers WHERE user_id = auth.uid();
  IF v_reseller_id IS NULL THEN
    RAISE EXCEPTION 'Sacoleira não encontrada';
  END IF;

  PERFORM 1 FROM public.resellers WHERE id = v_reseller_id FOR UPDATE;

  SELECT * INTO v_row
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;
  IF v_row.reseller_id <> v_reseller_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_row.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'status', 'cancelled', 'withdrawal_id', v_row.id);
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Somente solicitações pendentes podem ser canceladas';
  END IF;

  PERFORM public._release_withdrawal_hold(v_row, 'cancel');

  UPDATE public.withdrawal_requests SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancellation_reason = NULLIF(trim(COALESCE(p_reason, '')), ''),
    balance_released = true,
    updated_at = now()
  WHERE id = v_row.id;

  PERFORM public._log_withdrawal_audit(
    v_row.id, 'cancel', 'pending', 'cancelled',
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'status', 'cancelled', 'withdrawal_id', v_row.id);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_withdrawal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal(uuid, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 10) approve_withdrawal (admin)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_withdrawal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.withdrawal_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem aprovar saques';
  END IF;

  SELECT * INTO v_row FROM public.withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;
  IF v_row.status = 'approved' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'status', 'approved', 'withdrawal_id', v_row.id);
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Transição inválida: % → approved', v_row.status;
  END IF;

  UPDATE public.withdrawal_requests SET
    status = 'approved',
    approved_at = now(),
    approved_by = auth.uid(),
    updated_at = now()
  WHERE id = v_row.id;

  PERFORM public._log_withdrawal_audit(v_row.id, 'approve', 'pending', 'approved', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'status', 'approved', 'withdrawal_id', v_row.id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_withdrawal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 11) reject_withdrawal (admin)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.withdrawal_requests%ROWTYPE;
  v_prev text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem rejeitar saques';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Motivo da rejeição é obrigatório';
  END IF;

  SELECT * INTO v_row FROM public.withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  IF v_row.status = 'rejected' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'status', 'rejected', 'withdrawal_id', v_row.id);
  END IF;
  IF v_row.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Transição inválida: % → rejected', v_row.status;
  END IF;
  IF v_row.status = 'approved' AND v_row.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'Saque já possui pagamento registrado';
  END IF;

  v_prev := v_row.status;
  PERFORM 1 FROM public.resellers WHERE id = v_row.reseller_id FOR UPDATE;
  PERFORM public._release_withdrawal_hold(v_row, 'reject');

  UPDATE public.withdrawal_requests SET
    status = 'rejected',
    rejected_at = now(),
    rejected_by = auth.uid(),
    rejection_reason = trim(p_reason),
    balance_released = true,
    updated_at = now()
  WHERE id = v_row.id;

  PERFORM public._log_withdrawal_audit(
    v_row.id, 'reject', v_prev, 'rejected',
    jsonb_build_object('reason', trim(p_reason))
  );

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'status', 'rejected', 'withdrawal_id', v_row.id);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_withdrawal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 12) mark_withdrawal_paid (admin)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(
  p_withdrawal_id uuid,
  p_payment_reference text,
  p_receipt_url text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.withdrawal_requests%ROWTYPE;
  v_key text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem marcar saques como pagos';
  END IF;

  v_key := NULLIF(trim(COALESCE(p_idempotency_key, '')), '');
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key é obrigatória para pagamento';
  END IF;

  IF NOT public._is_safe_receipt_url(p_receipt_url) THEN
    RAISE EXCEPTION 'URL de comprovante inválida';
  END IF;

  SELECT * INTO v_row
  FROM public.withdrawal_requests
  WHERE payment_idempotency_key = v_key;
  IF FOUND THEN
    IF v_row.id <> p_withdrawal_id THEN
      RAISE EXCEPTION 'idempotency_key já usada em outro saque';
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', v_row.status,
      'withdrawal_id', v_row.id,
      'paid_at', v_row.paid_at
    );
  END IF;

  SELECT * INTO v_row FROM public.withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  IF v_row.status = 'paid' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'paid',
      'withdrawal_id', v_row.id,
      'paid_at', v_row.paid_at
    );
  END IF;

  IF v_row.status <> 'approved' THEN
    RAISE EXCEPTION 'Transição inválida: % → paid (somente approved)', v_row.status;
  END IF;

  PERFORM 1 FROM public.resellers WHERE id = v_row.reseller_id FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE withdrawal_id = v_row.id AND type = 'withdrawal_paid'
  ) THEN
    INSERT INTO public.wallet_transactions (
      reseller_id, type, amount, status, description, withdrawal_id
    ) VALUES (
      v_row.reseller_id,
      'withdrawal_paid',
      0,
      'paid',
      'Saque pago',
      v_row.id
    );
  END IF;

  UPDATE public.withdrawal_requests SET
    status = 'paid',
    paid_at = now(),
    paid_by = auth.uid(),
    payment_reference = NULLIF(trim(COALESCE(p_payment_reference, '')), ''),
    receipt_url = NULLIF(trim(COALESCE(p_receipt_url, '')), ''),
    payment_idempotency_key = v_key,
    updated_at = now()
  WHERE id = v_row.id;

  PERFORM public._log_withdrawal_audit(
    v_row.id, 'pay', 'approved', 'paid',
    jsonb_build_object(
      'payment_reference', p_payment_reference,
      'has_receipt', p_receipt_url IS NOT NULL AND length(trim(p_receipt_url)) > 0
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'paid',
    'withdrawal_id', v_row.id,
    'paid_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_withdrawal_paid(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_paid(uuid, text, text, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 13) get_my_withdrawal_summary
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_withdrawal_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller_id uuid;
  v_available numeric(14,2);
  v_blocked numeric(14,2);
  v_pending_count int;
  v_min numeric(14,2);
  v_profile public.reseller_payout_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO v_reseller_id FROM public.resellers WHERE user_id = auth.uid();
  IF v_reseller_id IS NULL THEN
    RAISE EXCEPTION 'Sacoleira não encontrada';
  END IF;

  SELECT COALESCE(SUM(amount), 0)::numeric(14,2) INTO v_available
  FROM public.wallet_transactions
  WHERE reseller_id = v_reseller_id AND status = 'available';

  SELECT COALESCE(SUM(amount), 0)::numeric(14,2), count(*)::int
    INTO v_blocked, v_pending_count
  FROM public.withdrawal_requests
  WHERE reseller_id = v_reseller_id AND status IN ('pending', 'approved');

  SELECT minimum_withdrawal_amount INTO v_min FROM public.withdrawal_settings WHERE id = 1;

  SELECT * INTO v_profile FROM public.reseller_payout_profiles WHERE reseller_id = v_reseller_id;

  RETURN jsonb_build_object(
    'reseller_id', v_reseller_id,
    'available', v_available,
    'blocked', v_blocked,
    'minimum_withdrawal_amount', COALESCE(v_min, 50),
    'open_requests', v_pending_count,
    'payout_method', v_profile.payment_method,
    'has_payout_profile', v_profile.reseller_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_withdrawal_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_withdrawal_summary() TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 14) admin_list_withdrawals
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_withdrawals(
  p_status text DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL,
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
  v_offset int;
  v_total bigint;
  v_items jsonb;
  v_stats jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  v_offset := (v_page - 1) * v_size;

  WITH filtered AS (
    SELECT wr.*, r.display_name AS reseller_name, r.email AS reseller_email
    FROM public.withdrawal_requests wr
    JOIN public.resellers r ON r.id = wr.reseller_id
    WHERE (p_status IS NULL OR wr.status = p_status)
      AND (p_reseller_id IS NULL OR wr.reseller_id = p_reseller_id)
      AND (p_date_from IS NULL OR wr.requested_at >= p_date_from)
      AND (p_date_to IS NULL OR wr.requested_at <= p_date_to)
      AND (p_amount_min IS NULL OR wr.amount >= p_amount_min)
      AND (p_amount_max IS NULL OR wr.amount <= p_amount_max)
      AND (
        p_search IS NULL OR length(trim(p_search)) = 0
        OR r.display_name ILIKE '%' || trim(p_search) || '%'
        OR r.email ILIKE '%' || trim(p_search) || '%'
        OR wr.payment_reference ILIKE '%' || trim(p_search) || '%'
        OR wr.id::text ILIKE '%' || trim(p_search) || '%'
      )
  )
  SELECT count(*) INTO v_total FROM filtered;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.requested_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      wr.id,
      wr.reseller_id,
      r.display_name AS reseller_name,
      r.email AS reseller_email,
      wr.amount,
      wr.status,
      wr.payment_method,
      wr.requested_at,
      wr.approved_at,
      wr.rejected_at,
      wr.paid_at,
      wr.rejection_reason,
      wr.payment_reference,
      wr.receipt_url
    FROM public.withdrawal_requests wr
    JOIN public.resellers r ON r.id = wr.reseller_id
    WHERE (p_status IS NULL OR wr.status = p_status)
      AND (p_reseller_id IS NULL OR wr.reseller_id = p_reseller_id)
      AND (p_date_from IS NULL OR wr.requested_at >= p_date_from)
      AND (p_date_to IS NULL OR wr.requested_at <= p_date_to)
      AND (p_amount_min IS NULL OR wr.amount >= p_amount_min)
      AND (p_amount_max IS NULL OR wr.amount <= p_amount_max)
      AND (
        p_search IS NULL OR length(trim(p_search)) = 0
        OR r.display_name ILIKE '%' || trim(p_search) || '%'
        OR r.email ILIKE '%' || trim(p_search) || '%'
        OR wr.payment_reference ILIKE '%' || trim(p_search) || '%'
        OR wr.id::text ILIKE '%' || trim(p_search) || '%'
      )
    ORDER BY wr.requested_at DESC
    OFFSET v_offset LIMIT v_size
  ) x;

  SELECT jsonb_build_object(
    'pending_count', count(*) FILTER (WHERE status = 'pending'),
    'approved_count', count(*) FILTER (WHERE status = 'approved'),
    'paid_count_period', count(*) FILTER (
      WHERE status = 'paid'
        AND (p_date_from IS NULL OR paid_at >= p_date_from)
        AND (p_date_to IS NULL OR paid_at <= p_date_to)
    ),
    'pending_amount', COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','approved')), 0)
  )
  INTO v_stats
  FROM public.withdrawal_requests;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'page_size', v_size,
    'stats', v_stats
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_withdrawals(text, uuid, text, timestamptz, timestamptz, numeric, numeric, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_withdrawals(text, uuid, text, timestamptz, timestamptz, numeric, numeric, int, int) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 15) get_withdrawal_audit + get_withdrawal_details + list_my_withdrawals
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_withdrawal_audit(p_withdrawal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.withdrawal_requests%ROWTYPE;
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_row FROM public.withdrawal_requests WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  IF NOT public.is_admin(auth.uid()) AND NOT public.owns_reseller(v_row.reseller_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(a)::jsonb ORDER BY a.created_at), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT id, action, previous_status, new_status, actor_user_id, actor_role, metadata, created_at
    FROM public.withdrawal_audit_log
    WHERE withdrawal_id = p_withdrawal_id
    ORDER BY created_at ASC
  ) a;

  RETURN jsonb_build_object('withdrawal_id', p_withdrawal_id, 'items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.get_withdrawal_audit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_audit(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_withdrawal_details(
  p_withdrawal_id uuid,
  p_reveal_payment boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.withdrawal_requests%ROWTYPE;
  v_name text;
  v_email text;
  v_is_admin boolean;
  v_owns boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_row FROM public.withdrawal_requests WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saque não encontrado';
  END IF;

  v_is_admin := public.is_admin(auth.uid());
  v_owns := public.owns_reseller(v_row.reseller_id);
  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT display_name, email INTO v_name, v_email
  FROM public.resellers WHERE id = v_row.reseller_id;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'reseller_id', v_row.reseller_id,
    'reseller_name', v_name,
    'reseller_email', v_email,
    'amount', v_row.amount,
    'status', v_row.status,
    'payment_method', v_row.payment_method,
    'payment_details', CASE
      WHEN v_is_admin AND p_reveal_payment THEN v_row.payment_details
      ELSE jsonb_build_object('masked', true, 'method', v_row.payment_method)
    END,
    'requested_at', v_row.requested_at,
    'approved_at', v_row.approved_at,
    'rejected_at', v_row.rejected_at,
    'rejection_reason', v_row.rejection_reason,
    'paid_at', v_row.paid_at,
    'payment_reference', v_row.payment_reference,
    'receipt_url', v_row.receipt_url,
    'cancelled_at', v_row.cancelled_at,
    'cancellation_reason', v_row.cancellation_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_withdrawal_details(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_details(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_my_withdrawals(
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller_id uuid;
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_total bigint;
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO v_reseller_id FROM public.resellers WHERE user_id = auth.uid();
  IF v_reseller_id IS NULL THEN
    RAISE EXCEPTION 'Sacoleira não encontrada';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.withdrawal_requests WHERE reseller_id = v_reseller_id;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.requested_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      id, amount, status, payment_method, requested_at,
      rejected_at, rejection_reason, paid_at, payment_reference, receipt_url,
      cancelled_at
    FROM public.withdrawal_requests
    WHERE reseller_id = v_reseller_id
    ORDER BY requested_at DESC
    OFFSET (v_page - 1) * v_size
    LIMIT v_size
  ) x;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'page', v_page, 'page_size', v_size);
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_withdrawals(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_withdrawals(int, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_withdrawal_settings(p_minimum numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;
  IF p_minimum IS NULL OR p_minimum <= 0 OR p_minimum <> round(p_minimum, 2) THEN
    RAISE EXCEPTION 'Mínimo inválido';
  END IF;

  UPDATE public.withdrawal_settings
  SET minimum_withdrawal_amount = round(p_minimum, 2),
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true, 'minimum_withdrawal_amount', round(p_minimum, 2));
END;
$$;

REVOKE ALL ON FUNCTION public.update_withdrawal_settings(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_withdrawal_settings(numeric) TO authenticated, service_role;