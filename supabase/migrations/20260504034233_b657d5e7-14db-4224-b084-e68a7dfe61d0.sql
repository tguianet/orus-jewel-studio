CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'paid'::order_status, updated_at = now()
  WHERE id = _order_id;

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
END;
$$;