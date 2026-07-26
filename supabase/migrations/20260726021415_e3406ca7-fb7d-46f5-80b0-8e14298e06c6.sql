-- =============================================================================
-- Estorno de comissões / carteira para pedidos paid → cancelled | refunded
-- - Preserva commissions originais (rate/amount/level)
-- - Cria wallet_transactions type=commission_reversal (amount negativo)
-- - Idempotente via unique parcial
-- - cancel_paid_order / refund_paid_order NÃO restauram estoque nesta fase
-- - Pedidos não pagos cancelados mantêm restore de estoque atual
-- =============================================================================

-- 1) Enum: refunded
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';

-- 2) wallet_transactions.type: aceitar commission_reversal
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('commission', 'commission_reversal', 'withdrawal', 'adjustment'));

-- 3) Unique: um estorno por comissão
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_commission_reversal_uidx
  ON public.wallet_transactions (commission_id)
  WHERE commission_id IS NOT NULL
    AND type = 'commission_reversal';

-- 4) Motivo do lançamento
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS reason text;

COMMENT ON COLUMN public.wallet_transactions.reason IS
  'Motivo informado pelo admin em estornos/ajustes. NULL para lançamentos legados.';

-- 5) Restore de estoque: pula apenas quando a TX define app.skip_stock_restore_on_cancel=on
--    Trigger permanece; cancelamento de pedidos NÃO pagos continua restaurando estoque.
CREATE OR REPLACE FUNCTION public.restore_stock_on_order_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_before integer;
  v_after integer;
BEGIN
  IF NEW.status = 'cancelled'::public.order_status
     AND OLD.status IS DISTINCT FROM 'cancelled'::public.order_status THEN

    -- Fluxo financeiro cancel_paid_order: sem devolução automática de estoque nesta fase
    IF COALESCE(current_setting('app.skip_stock_restore_on_cancel', true), 'off') = 'on' THEN
      PERFORM public.write_audit_log(
        'order_cancelled_stock_restore_skipped',
        'orders',
        NEW.id::text,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        jsonb_build_object(
          'source', 'restore_stock_on_order_cancelled',
          'note', 'Estoque não alterado no cancelamento financeiro de pedido pago (fase posterior)'
        )
      );
      RETURN NEW;
    END IF;

    FOR r IN
      SELECT oi.product_id, oi.quantity, oi.seller_store_id
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
      ORDER BY oi.product_id
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.stock_movements sm
        WHERE sm.order_id = NEW.id
          AND sm.product_id = r.product_id
          AND sm.movement_type = 'cancel_restore'
      ) THEN
        CONTINUE;
      END IF;

      SELECT stock INTO v_before
      FROM public.products
      WHERE id = r.product_id
      FOR UPDATE;

      v_after := v_before + r.quantity;

      UPDATE public.products
      SET stock = v_after, updated_at = now()
      WHERE id = r.product_id;

      INSERT INTO public.stock_movements (
        product_id, seller_store_id, order_id, movement_type,
        quantity, quantity_before, quantity_after, performed_by, reason
      ) VALUES (
        r.product_id, r.seller_store_id, NEW.id, 'cancel_restore',
        r.quantity, v_before, v_after, auth.uid(),
        'Devolução por cancelamento do pedido'
      );
    END LOOP;

    PERFORM public.write_audit_log(
      'order_cancelled_stock_restored',
      'orders',
      NEW.id::text,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      jsonb_build_object('source', 'restore_stock_on_order_cancelled')
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.restore_stock_on_order_cancelled() IS
  'Restaura estoque ao cancelar. Ignora restore se app.skip_stock_restore_on_cancel=on (cancel_paid_order).';

-- 6) reverse_mlm_commissions_for_order
-- Regras financeiras:
-- - wallet pending/available → cancelar crédito (sai da view); NÃO criar reversal available
-- - wallet paid → preservar paid; criar commission_reversal -amount available
-- - sem wallet → só cancelar commission; reversal available só se commission original era paid
-- - total_reversed = soma dos débitos negativos inseridos NESTA chamada
CREATE OR REPLACE FUNCTION public.reverse_mlm_commissions_for_order(
  _order_id uuid,
  _reason text
)
RETURNS TABLE (
  order_id uuid,
  commissions_reversed integer,
  wallet_reversals_created integer,
  total_reversed numeric,
  already_reversed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean;
  v_order public.orders%ROWTYPE;
  v_reason text := trim(COALESCE(_reason, ''));
  v_comm record;
  v_wallet public.wallet_transactions%ROWTYPE;
  v_rev_id uuid;
  v_rev_amount numeric;
  v_created integer := 0;
  v_reversed_comms integer := 0;
  v_total numeric := 0;
  v_existing_reversals integer := 0;
  v_comm_count integer := 0;
  v_original_commission_status text;
  v_original_wallet_found boolean;
  v_original_wallet_status text;
  v_action text;
  v_has_existing_reversal boolean;
  v_did_work boolean := false;
  v_actions jsonb := '[]'::jsonb;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem estornar comissões';
    END IF;
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'Motivo do estorno é obrigatório';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status IS DISTINCT FROM 'cancelled'::public.order_status
     AND v_order.status IS DISTINCT FROM 'refunded'::public.order_status THEN
    RAISE EXCEPTION 'Estorno só é permitido para pedidos cancelled ou refunded';
  END IF;

  SELECT COUNT(*)::integer INTO v_comm_count
  FROM public.commissions c
  WHERE c.order_id = _order_id;

  SELECT COUNT(*)::integer INTO v_existing_reversals
  FROM public.wallet_transactions wt
  JOIN public.commissions c ON c.id = wt.commission_id
  WHERE c.order_id = _order_id
    AND wt.type = 'commission_reversal';

  FOR v_comm IN
    SELECT c.*
    FROM public.commissions c
    WHERE c.order_id = _order_id
    ORDER BY c.level
    FOR UPDATE
  LOOP
    -- Capturar estados originais ANTES de qualquer UPDATE
    v_original_commission_status := v_comm.status;
    v_original_wallet_found := false;
    v_original_wallet_status := NULL;
    v_action := NULL;
    v_has_existing_reversal := false;
    v_rev_id := NULL;

    SELECT EXISTS (
      SELECT 1
      FROM public.wallet_transactions wt
      WHERE wt.commission_id = v_comm.id
        AND wt.type = 'commission_reversal'
    ) INTO v_has_existing_reversal;

    -- SELECT INTO sem linha NÃO zera o rowtype; usar variável booleana explícita.
    SELECT * INTO v_wallet
    FROM public.wallet_transactions wt
    WHERE wt.commission_id = v_comm.id
      AND wt.type = 'commission'
    FOR UPDATE
    LIMIT 1;

    v_original_wallet_found := FOUND;
    IF v_original_wallet_found THEN
      v_original_wallet_status := v_wallet.status;
    ELSE
      v_original_wallet_status := NULL;
    END IF;

    -- Idempotência: já existe reversal → não altera saldo de novo
    IF v_has_existing_reversal THEN
      IF v_original_commission_status IS DISTINCT FROM 'cancelled' THEN
        UPDATE public.commissions
        SET status = 'cancelled', updated_at = now()
        WHERE id = v_comm.id
          AND status IS DISTINCT FROM 'cancelled';
        v_reversed_comms := v_reversed_comms + 1;
        v_did_work := true;
      END IF;
      v_action := 'already_reversed';
      v_actions := v_actions || jsonb_build_array(jsonb_build_object(
        'commission_id', v_comm.id,
        'order_id', _order_id,
        'reseller_id', v_comm.reseller_id,
        'level', v_comm.level,
        'amount', v_comm.amount,
        'original_commission_status', v_original_commission_status,
        'original_wallet_status', v_original_wallet_status,
        'original_wallet_found', v_original_wallet_found,
        'action', v_action,
        'reason', v_reason
      ));
      CONTINUE;
    END IF;

    -- Idempotência crédito: commission + wallet já cancelled (sem débito a criar)
    IF v_original_commission_status = 'cancelled'
       AND v_original_wallet_found
       AND v_original_wallet_status = 'cancelled' THEN
      v_action := 'already_reversed';
      v_actions := v_actions || jsonb_build_array(jsonb_build_object(
        'commission_id', v_comm.id,
        'order_id', _order_id,
        'reseller_id', v_comm.reseller_id,
        'level', v_comm.level,
        'amount', v_comm.amount,
        'original_commission_status', v_original_commission_status,
        'original_wallet_status', v_original_wallet_status,
        'original_wallet_found', v_original_wallet_found,
        'action', v_action,
        'reason', v_reason
      ));
      CONTINUE;
    END IF;

    -- Idempotência sem wallet e sem débito: commission já cancelled e não era elegível a reversal
    -- (casos pending/available sem wallet). Se era paid, a 1ª chamada cria reversal e a 2ª
    -- cai no ramo v_has_existing_reversal.
    IF v_original_commission_status = 'cancelled'
       AND NOT v_original_wallet_found THEN
      v_action := 'already_reversed';
      v_actions := v_actions || jsonb_build_array(jsonb_build_object(
        'commission_id', v_comm.id,
        'order_id', _order_id,
        'reseller_id', v_comm.reseller_id,
        'level', v_comm.level,
        'amount', v_comm.amount,
        'original_commission_status', v_original_commission_status,
        'original_wallet_status', v_original_wallet_status,
        'original_wallet_found', v_original_wallet_found,
        'action', v_action,
        'reason', v_reason
      ));
      CONTINUE;
    END IF;

    -- Cancelar commission (preserva rate/amount/level)
    IF v_original_commission_status IS DISTINCT FROM 'cancelled' THEN
      UPDATE public.commissions
      SET status = 'cancelled', updated_at = now()
      WHERE id = v_comm.id
        AND status IS DISTINCT FROM 'cancelled';
      v_reversed_comms := v_reversed_comms + 1;
      v_did_work := true;
    END IF;

    IF v_original_wallet_found AND v_original_wallet_status IN ('pending', 'available') THEN
      -- Crédito ainda não pago: cancela e sai da view → saldo 0. Sem débito available.
      UPDATE public.wallet_transactions
      SET status = 'cancelled', updated_at = now()
      WHERE id = v_wallet.id
        AND status IN ('pending', 'available');
      v_action := 'credit_cancelled';
      v_did_work := true;

    ELSIF v_original_wallet_found AND v_original_wallet_status = 'paid' THEN
      -- Crédito já pago: preserva paid; cria débito available (amount original da commission).
      v_rev_amount := -ABS(COALESCE(v_comm.amount, 0));
      BEGIN
        INSERT INTO public.wallet_transactions (
          reseller_id, commission_id, type, amount, status, description, reason
        ) VALUES (
          v_comm.reseller_id,
          v_comm.id,
          'commission_reversal',
          v_rev_amount,
          'available',
          'Estorno MLM nível ' || v_comm.level::text || ' — pedido ' || _order_id::text,
          v_reason
        )
        RETURNING id INTO v_rev_id;

        v_created := v_created + 1;
        v_total := v_total + ABS(v_rev_amount);
        v_action := 'paid_credit_preserved_and_debit_created';
        v_did_work := true;
      EXCEPTION
        WHEN unique_violation THEN
          v_action := 'already_reversed';
      END;

    ELSIF NOT v_original_wallet_found AND v_original_commission_status = 'paid' THEN
      -- Sem wallet + commission paid → cria débito de compensação com amount original
      v_rev_amount := -ABS(COALESCE(v_comm.amount, 0));
      BEGIN
        INSERT INTO public.wallet_transactions (
          reseller_id, commission_id, type, amount, status, description, reason
        ) VALUES (
          v_comm.reseller_id,
          v_comm.id,
          'commission_reversal',
          v_rev_amount,
          'available',
          'Estorno MLM nível ' || v_comm.level::text || ' — pedido ' || _order_id::text,
          v_reason
        )
        RETURNING id INTO v_rev_id;

        v_created := v_created + 1;
        v_total := v_total + ABS(v_rev_amount);
        v_action := 'paid_credit_preserved_and_debit_created';
        v_did_work := true;
      EXCEPTION
        WHEN unique_violation THEN
          v_action := 'already_reversed';
      END;

    ELSE
      -- Sem wallet e commission não paid: só cancelamento da commission
      v_action := 'commission_cancelled_without_wallet';
    END IF;

    v_actions := v_actions || jsonb_build_array(jsonb_build_object(
      'commission_id', v_comm.id,
      'order_id', _order_id,
      'reseller_id', v_comm.reseller_id,
      'level', v_comm.level,
      'amount', v_comm.amount,
      'original_commission_status', v_original_commission_status,
      'original_wallet_status', v_original_wallet_status,
      'original_wallet_found', v_original_wallet_found,
      'action', v_action,
      'reason', v_reason,
      'reversal_id', v_rev_id
    ));
  END LOOP;

  -- already_reversed: nenhuma alteração nova (nem débito, nem cancelamento) nesta chamada
  already_reversed := (NOT v_did_work AND v_created = 0);

  PERFORM public.write_audit_log(
    'reverse_mlm_commissions_for_order',
    'orders',
    _order_id::text,
    jsonb_build_object(
      'status', v_order.status,
      'existing_reversals', v_existing_reversals,
      'commission_rows', v_comm_count
    ),
    jsonb_build_object(
      'commissions_reversed', v_reversed_comms,
      'wallet_reversals_created', v_created,
      'total_reversed', v_total,
      'reason', v_reason,
      'actions', v_actions
    ),
    jsonb_build_object(
      'source', 'reverse_mlm_commissions_for_order',
      'actor_id', auth.uid(),
      'already_reversed', already_reversed,
      'note', 'total_reversed = débitos negativos inseridos nesta chamada apenas'
    )
  );

  order_id := _order_id;
  commissions_reversed := v_reversed_comms;
  wallet_reversals_created := v_created;
  total_reversed := v_total;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.reverse_mlm_commissions_for_order(uuid, text) IS
  'Estorna commissions: pending/available só cancela crédito (saldo 0); paid cria commission_reversal available. Usa amount original. Idempotente.';

-- 7) cancel_paid_order
CREATE OR REPLACE FUNCTION public.cancel_paid_order(
  _order_id uuid,
  _reason text
)
RETURNS TABLE (
  order_id uuid,
  commissions_reversed integer,
  wallet_reversals_created integer,
  total_reversed numeric,
  already_reversed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean;
  v_order public.orders%ROWTYPE;
  v_reason text := trim(COALESCE(_reason, ''));
  v_result record;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem cancelar pedidos pagos';
    END IF;
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status = 'refunded'::public.order_status THEN
    RAISE EXCEPTION 'Pedido reembolsado não pode ser cancelado; use o histórico de estorno';
  END IF;

  IF v_order.status IS DISTINCT FROM 'paid'::public.order_status
     AND v_order.status IS DISTINCT FROM 'cancelled'::public.order_status THEN
    RAISE EXCEPTION 'cancel_paid_order só aceita pedidos paid (ou cancelled para reconciliar)';
  END IF;

  -- Permite sair de paid; impede restore automático de estoque neste fluxo
  PERFORM set_config('app.allow_paid_reversal', 'on', true);
  PERFORM set_config('app.skip_stock_restore_on_cancel', 'on', true);

  IF v_order.status = 'paid'::public.order_status THEN
    UPDATE public.orders
    SET status = 'cancelled'::public.order_status, updated_at = now()
    WHERE id = _order_id;
  END IF;

  SELECT * INTO v_result
  FROM public.reverse_mlm_commissions_for_order(_order_id, v_reason);

  PERFORM public.write_audit_log(
    'cancel_paid_order',
    'orders',
    _order_id::text,
    jsonb_build_object('status', v_order.status, 'total', v_order.total),
    jsonb_build_object(
      'status', 'cancelled',
      'commissions_reversed', v_result.commissions_reversed,
      'wallet_reversals_created', v_result.wallet_reversals_created,
      'total_reversed', v_result.total_reversed,
      'already_reversed', v_result.already_reversed,
      'reason', v_reason,
      'stock_restored', false
    ),
    jsonb_build_object('source', 'cancel_paid_order', 'actor_id', auth.uid())
  );

  order_id := v_result.order_id;
  commissions_reversed := v_result.commissions_reversed;
  wallet_reversals_created := v_result.wallet_reversals_created;
  total_reversed := v_result.total_reversed;
  already_reversed := v_result.already_reversed;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.cancel_paid_order(uuid, text) IS
  'Cancela pedido paid, estorna comissões e NÃO restaura estoque (fase financeira).';

-- 8) refund_paid_order
CREATE OR REPLACE FUNCTION public.refund_paid_order(
  _order_id uuid,
  _reason text
)
RETURNS TABLE (
  order_id uuid,
  commissions_reversed integer,
  wallet_reversals_created integer,
  total_reversed numeric,
  already_reversed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean;
  v_order public.orders%ROWTYPE;
  v_reason text := trim(COALESCE(_reason, ''));
  v_result record;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem reembolsar pedidos pagos';
    END IF;
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'Motivo do reembolso é obrigatório';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status = 'cancelled'::public.order_status THEN
    RAISE EXCEPTION 'Pedido cancelado não pode ser reembolsado por este fluxo';
  END IF;

  IF v_order.status IS DISTINCT FROM 'paid'::public.order_status
     AND v_order.status IS DISTINCT FROM 'refunded'::public.order_status THEN
    RAISE EXCEPTION 'refund_paid_order só aceita pedidos paid (ou refunded para reconciliar)';
  END IF;

  PERFORM set_config('app.allow_paid_reversal', 'on', true);
  -- refunded não dispara restore_stock (trigger só em cancelled); flag por segurança
  PERFORM set_config('app.skip_stock_restore_on_cancel', 'on', true);

  IF v_order.status = 'paid'::public.order_status THEN
    UPDATE public.orders
    SET status = 'refunded'::public.order_status, updated_at = now()
    WHERE id = _order_id;
  END IF;

  SELECT * INTO v_result
  FROM public.reverse_mlm_commissions_for_order(_order_id, v_reason);

  PERFORM public.write_audit_log(
    'refund_paid_order',
    'orders',
    _order_id::text,
    jsonb_build_object('status', v_order.status, 'total', v_order.total),
    jsonb_build_object(
      'status', 'refunded',
      'commissions_reversed', v_result.commissions_reversed,
      'wallet_reversals_created', v_result.wallet_reversals_created,
      'total_reversed', v_result.total_reversed,
      'already_reversed', v_result.already_reversed,
      'reason', v_reason,
      'stock_restored', false
    ),
    jsonb_build_object('source', 'refund_paid_order', 'actor_id', auth.uid())
  );

  order_id := v_result.order_id;
  commissions_reversed := v_result.commissions_reversed;
  wallet_reversals_created := v_result.wallet_reversals_created;
  total_reversed := v_result.total_reversed;
  already_reversed := v_result.already_reversed;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.refund_paid_order(uuid, text) IS
  'Reembolsa pedido paid, estorna comissões e NÃO altera estoque.';

-- 9) Permissões
REVOKE ALL ON FUNCTION public.reverse_mlm_commissions_for_order(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_paid_order(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refund_paid_order(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.reverse_mlm_commissions_for_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_paid_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_paid_order(uuid, text) TO authenticated, service_role;

-- Nota: saída de paid por UPDATE direto continua bloqueada por protect_orders_paid_status
-- (exige app.allow_paid_reversal=on, ligado só nestas RPCs).