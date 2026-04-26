CREATE OR REPLACE FUNCTION public.release_wallet_for_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid'::order_status, 'confirmed'::order_status, 'shipped'::order_status, 'delivered'::order_status)
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

CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'paid'::order_status,
      updated_at = now()
  WHERE id = _order_id;
END;
$$;