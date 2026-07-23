-- =============================================================================
-- Fase 2.4 — Comissões e carteira somente em paid (Lovable Cloud)
-- Pré-requisito: 20260722140000_phase2_audit (+ preferível stock já aplicado)
-- NÃO apaga comissões históricas.
-- =============================================================================

DROP TRIGGER IF EXISTS trg_orders_created_commissions ON public.orders;
DROP TRIGGER IF EXISTS orders_create_mlm_commissions ON public.orders;

CREATE OR REPLACE FUNCTION public.release_wallet_for_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid'::public.order_status
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.commissions
    SET status = 'available', updated_at = now()
    WHERE order_id = NEW.id
      AND status = 'pending';

    UPDATE public.wallet_transactions wt
    SET status = 'available', updated_at = now()
    FROM public.commissions c
    WHERE wt.commission_id = c.id
      AND c.order_id = NEW.id
      AND wt.status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_release_wallet ON public.orders;
DROP TRIGGER IF EXISTS orders_release_wallet_on_paid ON public.orders;
CREATE TRIGGER trg_orders_release_wallet
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.release_wallet_for_paid_order();

CREATE OR REPLACE FUNCTION public.protect_orders_paid_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'paid'::public.order_status
     AND NEW.status IS DISTINCT FROM 'paid'::public.order_status THEN
    IF COALESCE(current_setting('app.allow_paid_reversal', true), 'off') IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'Pedido pago não pode mudar de status sem fluxo de estorno (app.allow_paid_reversal=on)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_orders_paid_status ON public.orders;
CREATE TRIGGER trg_protect_orders_paid_status
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_orders_paid_status();

CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_had_commissions boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem marcar pedidos como pagos';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status = 'cancelled'::public.order_status THEN
    RAISE EXCEPTION 'Pedido cancelado não pode ser marcado como pago';
  END IF;

  IF v_order.status = 'paid'::public.order_status THEN
    PERFORM public.write_audit_log(
      'mark_order_paid_idempotent_noop',
      'orders',
      _order_id::text,
      jsonb_build_object('status', v_order.status),
      jsonb_build_object('status', v_order.status),
      jsonb_build_object('note', 'já estava paid')
    );
    RETURN;
  END IF;

  UPDATE public.orders
  SET status = 'paid'::public.order_status, updated_at = now()
  WHERE id = _order_id;

  SELECT EXISTS (
    SELECT 1 FROM public.commissions c WHERE c.order_id = _order_id
  ) INTO v_had_commissions;

  PERFORM public.create_mlm_commissions_for_order(_order_id);

  UPDATE public.commissions
  SET status = 'available', updated_at = now()
  WHERE order_id = _order_id AND status = 'pending';

  UPDATE public.wallet_transactions wt
  SET status = 'available', updated_at = now()
  FROM public.commissions c
  WHERE wt.commission_id = c.id
    AND c.order_id = _order_id
    AND wt.status = 'pending';

  PERFORM public.write_audit_log(
    'mark_order_paid',
    'orders',
    _order_id::text,
    jsonb_build_object(
      'status', v_order.status,
      'total', v_order.total,
      'had_commissions', v_had_commissions
    ),
    jsonb_build_object('status', 'paid'),
    jsonb_build_object('source', 'mark_order_paid')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_paid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.create_mlm_commissions_for_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_order_created_commissions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_wallet_for_paid_order() FROM PUBLIC, anon, authenticated;
