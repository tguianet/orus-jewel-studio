-- =============================================================================
-- Restore líquido no cancelamento (anti double-restock)
-- Isolada: não altera cancel_paid_order, refund_paid_order, reverse_mlm,
-- register_physical_return, checkout, commission_settings.
-- =============================================================================

-- 1) Bloqueio de UPDATE direto para cancelled (exceto skip_stock ou allow_direct_cancel)
CREATE OR REPLACE FUNCTION public.protect_direct_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled'::public.order_status
     AND OLD.status IS DISTINCT FROM 'cancelled'::public.order_status THEN

    IF COALESCE(current_setting('app.skip_stock_restore_on_cancel', true), 'off') = 'on' THEN
      RETURN NEW; -- cancel_paid_order
    END IF;

    IF COALESCE(current_setting('app.allow_direct_cancel', true), 'off') = 'on' THEN
      RETURN NEW; -- cancel_order_with_stock_restore
    END IF;

    RAISE EXCEPTION
      'Use cancel_order_with_stock_restore para cancelar este pedido.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_direct_order_cancel ON public.orders;
CREATE TRIGGER trg_protect_direct_order_cancel
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_direct_order_cancel();

COMMENT ON FUNCTION public.protect_direct_order_cancel() IS
  'Impede cancelled via UPDATE direto; exige cancel_order_with_stock_restore ou cancel_paid_order (skip_stock).';

-- 2) Trigger AFTER: restore líquido por product_id
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
  v_purchased integer;
  v_physically_returned integer;
  v_cancel_restored integer;
  v_remaining integer;
  v_has_cancel_restore boolean;
  v_seller_store_id uuid;
  v_details jsonb := '[]'::jsonb;
  v_units_restored integer := 0;
  v_skipped_zero integer := 0;
  v_products_touched integer := 0;
BEGIN
  IF NEW.status = 'cancelled'::public.order_status
     AND OLD.status IS DISTINCT FROM 'cancelled'::public.order_status THEN

    IF COALESCE(current_setting('app.skip_stock_restore_on_cancel', true), 'off') = 'on' THEN
      PERFORM public.write_audit_log(
        'order_cancelled_stock_restore_skipped',
        'orders',
        NEW.id::text,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        jsonb_build_object(
          'source', 'restore_stock_on_order_cancelled',
          'note', 'Estoque não alterado no cancelamento financeiro de pedido pago'
        )
      );
      RETURN NEW;
    END IF;

    FOR r IN
      SELECT oi.product_id
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
        AND oi.product_id IS NOT NULL
      GROUP BY oi.product_id
      ORDER BY oi.product_id
    LOOP
      SELECT COALESCE(SUM(oi.quantity), 0)::integer,
             (
               SELECT oi2.seller_store_id
               FROM public.order_items oi2
               WHERE oi2.order_id = NEW.id
                 AND oi2.product_id = r.product_id
                 AND oi2.seller_store_id IS NOT NULL
               LIMIT 1
             )
      INTO v_purchased, v_seller_store_id
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
        AND oi.product_id = r.product_id;

      SELECT COALESCE(SUM(pri.quantity), 0)::integer
      INTO v_physically_returned
      FROM public.product_return_items pri
      JOIN public.product_returns pr ON pr.id = pri.return_id
      WHERE pr.order_id = NEW.id
        AND pri.product_id = r.product_id;

      SELECT COALESCE(SUM(sm.quantity), 0)::integer
      INTO v_cancel_restored
      FROM public.stock_movements sm
      WHERE sm.order_id = NEW.id
        AND sm.product_id = r.product_id
        AND sm.movement_type = 'cancel_restore';

      v_has_cancel_restore := EXISTS (
        SELECT 1 FROM public.stock_movements sm2
        WHERE sm2.order_id = NEW.id
          AND sm2.product_id = r.product_id
          AND sm2.movement_type = 'cancel_restore'
      );

      v_remaining := GREATEST(v_purchased - v_physically_returned - v_cancel_restored, 0);

      IF v_has_cancel_restore AND v_remaining > 0 THEN
        PERFORM public.write_audit_log(
          'order_cancelled_stock_restore_anomaly',
          'orders',
          NEW.id::text,
          jsonb_build_object('status', OLD.status),
          jsonb_build_object(
            'product_id', r.product_id,
            'qty_purchased', v_purchased,
            'qty_physically_returned', v_physically_returned,
            'qty_cancel_restored', v_cancel_restored,
            'qty_remaining_to_restore', v_remaining
          ),
          jsonb_build_object(
            'source', 'restore_stock_on_order_cancelled',
            'note', 'cancel_restore já existe mas remaining > 0; unique impede segunda linha'
          )
        );
        RAISE EXCEPTION
          'Anomalia de estoque no pedido % produto %: cancel_restore já existe e ainda há remaining=%',
          NEW.id, r.product_id, v_remaining;
      END IF;

      IF v_remaining = 0 THEN
        v_skipped_zero := v_skipped_zero + 1;
        v_details := v_details || jsonb_build_array(jsonb_build_object(
          'product_id', r.product_id,
          'qty_purchased', v_purchased,
          'qty_physically_returned', v_physically_returned,
          'qty_cancel_restored', v_cancel_restored,
          'qty_remaining_to_restore', 0,
          'stock_before', NULL,
          'stock_after', NULL,
          'action', 'skipped_zero'
        ));
        CONTINUE;
      END IF;

      SELECT p.stock INTO v_before
      FROM public.products p
      WHERE p.id = r.product_id
      FOR UPDATE;

      IF v_before IS NULL THEN
        RAISE EXCEPTION 'Produto % não encontrado para restore', r.product_id;
      END IF;

      v_after := v_before + v_remaining;

      UPDATE public.products
      SET stock = v_after, updated_at = now()
      WHERE id = r.product_id;

      INSERT INTO public.stock_movements (
        product_id, seller_store_id, order_id, movement_type,
        quantity, quantity_before, quantity_after, performed_by, reason
      ) VALUES (
        r.product_id,
        COALESCE(v_seller_store_id, NEW.seller_store_id),
        NEW.id,
        'cancel_restore',
        v_remaining,
        v_before,
        v_after,
        auth.uid(),
        'Restore líquido por cancelamento do pedido'
      );

      v_units_restored := v_units_restored + v_remaining;
      v_products_touched := v_products_touched + 1;

      v_details := v_details || jsonb_build_array(jsonb_build_object(
        'product_id', r.product_id,
        'qty_purchased', v_purchased,
        'qty_physically_returned', v_physically_returned,
        'qty_cancel_restored', v_cancel_restored,
        'qty_remaining_to_restore', v_remaining,
        'stock_before', v_before,
        'stock_after', v_after,
        'action', 'restored'
      ));
    END LOOP;

    PERFORM public.write_audit_log(
      'order_cancelled_stock_restored',
      'orders',
      NEW.id::text,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object(
        'status', NEW.status,
        'units_restored', v_units_restored,
        'products_touched', v_products_touched,
        'skipped_zero', v_skipped_zero,
        'details', v_details
      ),
      jsonb_build_object(
        'source', 'restore_stock_on_order_cancelled',
        'liquid_restore', true
      )
    );

    -- Expõe resumo para a RPC na mesma TX (session local)
    PERFORM set_config('app.cancel_restore_units', v_units_restored::text, true);
    PERFORM set_config('app.cancel_restore_products', v_products_touched::text, true);
    PERFORM set_config('app.cancel_restore_skipped', v_skipped_zero::text, true);
    PERFORM set_config('app.cancel_restore_details', v_details::text, true);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.restore_stock_on_order_cancelled() IS
  'Restore líquido: purchased - physical_returns - cancel_restore. Anti double-restock. Skip se app.skip_stock_restore_on_cancel=on.';

-- Garante trigger AFTER ainda apontando para a função (já existe na maioria dos ambientes)
DROP TRIGGER IF EXISTS trg_restore_stock_on_order_cancelled ON public.orders;
CREATE TRIGGER trg_restore_stock_on_order_cancelled
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_order_cancelled();

-- 3) RPC cancel_order_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_order_with_stock_restore(
  _order_id uuid,
  _reason text
)
RETURNS TABLE (
  order_id uuid,
  units_restored integer,
  products_touched integer,
  skipped_zero integer,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean;
  v_order public.orders%ROWTYPE;
  v_reason text := trim(COALESCE(_reason, ''));
  v_units integer := 0;
  v_products integer := 0;
  v_skipped integer := 0;
  v_details jsonb := '[]'::jsonb;
  v_returned_total integer := 0;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem cancelar pedido com restore de estoque';
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

  IF v_order.status = 'paid'::public.order_status THEN
    RAISE EXCEPTION 'Pedido pago: use cancel_paid_order para estornar comissões sem restore automático de estoque';
  END IF;

  IF v_order.status = 'refunded'::public.order_status THEN
    RAISE EXCEPTION 'Pedido reembolsado não pode ser cancelado por esta RPC';
  END IF;

  IF v_order.status = 'cancelled'::public.order_status THEN
    -- Idempotente: sem alterações
    order_id := v_order.id;
    units_restored := 0;
    products_touched := 0;
    skipped_zero := 0;
    details := jsonb_build_array(jsonb_build_object('action', 'already_cancelled'));
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_order.status NOT IN (
    'new'::public.order_status,
    'confirmed'::public.order_status,
    'separated'::public.order_status,
    'shipped'::public.order_status,
    'delivered'::public.order_status
  ) THEN
    RAISE EXCEPTION 'Status % não permite cancel_order_with_stock_restore', v_order.status;
  END IF;

  SELECT COALESCE(SUM(pri.quantity), 0)::integer
  INTO v_returned_total
  FROM public.product_return_items pri
  JOIN public.product_returns pr ON pr.id = pri.return_id
  WHERE pr.order_id = v_order.id;

  PERFORM set_config('app.allow_direct_cancel', 'on', true);
  PERFORM set_config('app.cancel_restore_units', '0', true);
  PERFORM set_config('app.cancel_restore_products', '0', true);
  PERFORM set_config('app.cancel_restore_skipped', '0', true);
  PERFORM set_config('app.cancel_restore_details', '[]', true);

  UPDATE public.orders
  SET status = 'cancelled'::public.order_status,
      updated_at = now()
  WHERE id = v_order.id;

  v_units := COALESCE(NULLIF(current_setting('app.cancel_restore_units', true), '')::integer, 0);
  v_products := COALESCE(NULLIF(current_setting('app.cancel_restore_products', true), '')::integer, 0);
  v_skipped := COALESCE(NULLIF(current_setting('app.cancel_restore_skipped', true), '')::integer, 0);
  BEGIN
    v_details := COALESCE(current_setting('app.cancel_restore_details', true), '[]')::jsonb;
  EXCEPTION WHEN others THEN
    v_details := '[]'::jsonb;
  END;

  PERFORM public.write_audit_log(
    'cancel_order_with_stock_restore',
    'orders',
    v_order.id::text,
    jsonb_build_object(
      'status', v_order.status,
      'total', v_order.total,
      'physically_returned_units', v_returned_total
    ),
    jsonb_build_object(
      'status', 'cancelled',
      'reason', v_reason,
      'units_restored', v_units,
      'products_touched', v_products,
      'skipped_zero', v_skipped,
      'details', v_details
    ),
    jsonb_build_object(
      'source', 'cancel_order_with_stock_restore',
      'actor_id', auth.uid(),
      'commission_wallet_unchanged', true
    )
  );

  order_id := v_order.id;
  units_restored := v_units;
  products_touched := v_products;
  skipped_zero := v_skipped;
  details := v_details;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.cancel_order_with_stock_restore(uuid, text) IS
  'Cancela pedido não pago com restore líquido de estoque. Admin only. Não altera comissão/carteira.';

REVOKE ALL ON FUNCTION public.protect_direct_order_cancel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_order_with_stock_restore(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_stock_restore(uuid, text) TO authenticated, service_role;
