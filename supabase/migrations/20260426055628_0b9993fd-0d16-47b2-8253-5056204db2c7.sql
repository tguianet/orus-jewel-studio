CREATE OR REPLACE FUNCTION public.get_store_reseller_id(_store_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT reseller_id
  FROM public.seller_stores
  WHERE id = _store_id
$$;

CREATE OR REPLACE FUNCTION public.create_mlm_commissions_for_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record public.orders%ROWTYPE;
  source_reseller uuid;
  current_reseller uuid;
  parent_reseller uuid;
  commission_rates numeric[] := ARRAY[0.10, 0.05, 0.02];
  current_level integer := 1;
  commission_amount numeric;
  created_commission_id uuid;
BEGIN
  SELECT * INTO order_record
  FROM public.orders
  WHERE id = _order_id;

  IF order_record.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT reseller_id INTO source_reseller
  FROM public.seller_stores
  WHERE id = order_record.seller_store_id;

  IF source_reseller IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.commissions WHERE order_id = _order_id) THEN
    RETURN;
  END IF;

  current_reseller := source_reseller;

  WHILE current_reseller IS NOT NULL AND current_level <= 3 LOOP
    commission_amount := round((COALESCE(order_record.total, 0) * commission_rates[current_level])::numeric, 2);

    INSERT INTO public.commissions (
      order_id,
      reseller_id,
      source_reseller_id,
      level,
      rate,
      amount,
      status
    ) VALUES (
      _order_id,
      current_reseller,
      source_reseller,
      current_level,
      commission_rates[current_level],
      commission_amount,
      'pending'
    )
    RETURNING id INTO created_commission_id;

    INSERT INTO public.wallet_transactions (
      reseller_id,
      commission_id,
      type,
      amount,
      status,
      description
    ) VALUES (
      current_reseller,
      created_commission_id,
      'commission',
      commission_amount,
      'pending',
      CASE
        WHEN current_reseller = source_reseller THEN 'Ganho por venda — pedido ' || _order_id::text
        ELSE 'Comissão MLM nível ' || current_level::text || ' — pedido ' || _order_id::text
      END
    );

    SELECT parent_id INTO parent_reseller
    FROM public.resellers
    WHERE id = current_reseller;

    current_reseller := parent_reseller;
    current_level := current_level + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_order_created_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_mlm_commissions_for_order(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_wallet_for_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('pago'::order_status, 'confirmado'::order_status, 'enviado'::order_status, 'entregue'::order_status)
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

DROP TRIGGER IF EXISTS orders_create_mlm_commissions ON public.orders;
CREATE TRIGGER orders_create_mlm_commissions
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_created_commissions();

DROP TRIGGER IF EXISTS orders_release_wallet_on_paid ON public.orders;
CREATE TRIGGER orders_release_wallet_on_paid
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.release_wallet_for_paid_order();

DROP TRIGGER IF EXISTS validate_order_item_tenant_trigger ON public.order_items;
CREATE TRIGGER validate_order_item_tenant_trigger
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_item_tenant();

CREATE INDEX IF NOT EXISTS idx_orders_seller_store_status ON public.orders (seller_store_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_order_reseller ON public.commissions (order_id, reseller_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_commission ON public.wallet_transactions (commission_id);

DROP POLICY IF EXISTS "Public can create approved store order items" ON public.order_items;
CREATE POLICY "Public can create approved store order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  seller_store_id IS NOT NULL
  AND public.is_approved_store(seller_store_id)
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND o.seller_store_id = order_items.seller_store_id
  )
);