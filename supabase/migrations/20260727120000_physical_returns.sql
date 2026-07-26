-- =============================================================================
-- Devoluções físicas (Amada Amante / Lovable Cloud)
-- Isolada: não altera cancel_paid_order, refund_paid_order, reverse_mlm...,
-- commission_settings, checkout nem valores históricos de orders/order_items.
-- =============================================================================

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.return_item_condition AS ENUM (
    'perfeito_estado',
    'embalagem_aberta',
    'avariado',
    'incompleto',
    'usado',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.return_stock_action AS ENUM (
    'retornar_ao_estoque',
    'nao_retornar_ao_estoque',
    'enviar_para_avaliacao'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.return_resolution AS ENUM (
    'devolucao',
    'troca'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.product_return_status AS ENUM (
    'registered'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) stock_movements: aceitar return_restore
ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_type_check;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_type_check CHECK (
    movement_type IN (
      'checkout_reserve',
      'cancel_restore',
      'admin_adjust',
      'manual',
      'return_restore'
    )
  );

-- 3) product_returns
CREATE TABLE IF NOT EXISTS public.product_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  seller_store_id uuid REFERENCES public.seller_stores(id) ON DELETE SET NULL,
  reason text NOT NULL,
  notes text,
  status public.product_return_status NOT NULL DEFAULT 'registered',
  performed_by uuid NOT NULL,
  financial_pending_amount numeric(10,2) NOT NULL DEFAULT 0,
  financial_pending_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_returns_reason_nonempty CHECK (length(trim(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_product_returns_order_id
  ON public.product_returns (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_returns_created
  ON public.product_returns (created_at DESC);

-- 4) product_return_items
CREATE TABLE IF NOT EXISTS public.product_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.product_returns(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  condition public.return_item_condition NOT NULL,
  stock_action public.return_stock_action NOT NULL,
  resolution public.return_resolution NOT NULL DEFAULT 'devolucao',
  reason text,
  notes text,
  stock_before integer,
  stock_after integer,
  stock_movement_id uuid UNIQUE REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  replacement_product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
  replacement_quantity integer,
  unit_price_original numeric(10,2) NOT NULL,
  unit_price_replacement numeric(10,2),
  value_difference numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_return_items_restock_condition_check CHECK (
    stock_action <> 'retornar_ao_estoque'
    OR condition IN ('perfeito_estado', 'embalagem_aberta')
  ),
  CONSTRAINT product_return_items_troca_check CHECK (
    (resolution = 'troca'
      AND replacement_product_id IS NOT NULL
      AND replacement_quantity IS NOT NULL
      AND replacement_quantity >= 1
      AND unit_price_replacement IS NOT NULL)
    OR
    (resolution = 'devolucao'
      AND replacement_product_id IS NULL
      AND replacement_quantity IS NULL)
  ),
  CONSTRAINT product_return_items_restock_movement_check CHECK (
    (stock_action = 'retornar_ao_estoque' AND stock_movement_id IS NOT NULL)
    OR
    (stock_action <> 'retornar_ao_estoque')
  )
);

CREATE INDEX IF NOT EXISTS idx_product_return_items_return_id
  ON public.product_return_items (return_id);
CREATE INDEX IF NOT EXISTS idx_product_return_items_order_item
  ON public.product_return_items (order_item_id);
CREATE INDEX IF NOT EXISTS idx_product_return_items_product
  ON public.product_return_items (product_id, created_at DESC);

-- 5) Trigger: nunca ultrapassar quantity comprada
CREATE OR REPLACE FUNCTION public.enforce_return_item_qty_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchased integer;
  v_returned integer;
BEGIN
  SELECT oi.quantity INTO v_purchased
  FROM public.order_items oi
  WHERE oi.id = NEW.order_item_id
  FOR UPDATE;

  IF v_purchased IS NULL THEN
    RAISE EXCEPTION 'Item de pedido não encontrado';
  END IF;

  SELECT COALESCE(SUM(pri.quantity), 0)::integer INTO v_returned
  FROM public.product_return_items pri
  WHERE pri.order_item_id = NEW.order_item_id
    AND (TG_OP = 'INSERT' OR pri.id IS DISTINCT FROM NEW.id);

  IF v_returned + NEW.quantity > v_purchased THEN
    RAISE EXCEPTION
      'Quantidade devolvida (%) ultrapassa o restante do item (comprado %, já devolvido %)',
      NEW.quantity, v_purchased, v_returned;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_return_item_qty_cap ON public.product_return_items;
CREATE TRIGGER trg_enforce_return_item_qty_cap
BEFORE INSERT OR UPDATE OF quantity, order_item_id
ON public.product_return_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_return_item_qty_cap();

-- 6) RLS
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select product returns" ON public.product_returns;
CREATE POLICY "Admins can select product returns"
ON public.product_returns
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can select product return items" ON public.product_return_items;
CREATE POLICY "Admins can select product return items"
ON public.product_return_items
FOR SELECT
TO authenticated
USING (public.is_admin());

REVOKE ALL ON TABLE public.product_returns FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.product_returns FROM authenticated;
GRANT SELECT ON TABLE public.product_returns TO authenticated;
GRANT ALL ON TABLE public.product_returns TO service_role;

REVOKE ALL ON TABLE public.product_return_items FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.product_return_items FROM authenticated;
GRANT SELECT ON TABLE public.product_return_items TO authenticated;
GRANT ALL ON TABLE public.product_return_items TO service_role;

-- 7) Preview RPC
CREATE OR REPLACE FUNCTION public.get_order_return_preview(_order_id uuid)
RETURNS TABLE (
  order_item_id uuid,
  product_id uuid,
  product_name text,
  quantity_purchased integer,
  quantity_returned integer,
  quantity_remaining integer,
  unit_price numeric,
  order_status public.order_status,
  eligible boolean,
  eligibility_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean;
  v_order public.orders%ROWTYPE;
  v_status_ok boolean;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem consultar prévia de devolução';
    END IF;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  v_status_ok := v_order.status IN (
    'paid'::public.order_status,
    'separated'::public.order_status,
    'shipped'::public.order_status,
    'delivered'::public.order_status,
    'refunded'::public.order_status,
    'cancelled'::public.order_status
  );

  RETURN QUERY
  SELECT
    oi.id,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    COALESCE(r.qty_returned, 0)::integer,
    GREATEST(oi.quantity - COALESCE(r.qty_returned, 0), 0)::integer,
    oi.unit_price,
    v_order.status,
    CASE
      WHEN NOT v_status_ok THEN false
      WHEN oi.product_id IS NULL THEN false
      WHEN v_order.status = 'cancelled'::public.order_status
           AND EXISTS (
             SELECT 1 FROM public.stock_movements sm
             WHERE sm.order_id = v_order.id
               AND sm.product_id = oi.product_id
               AND sm.movement_type = 'cancel_restore'
           ) THEN false
      WHEN oi.quantity - COALESCE(r.qty_returned, 0) <= 0 THEN false
      ELSE true
    END,
    CASE
      WHEN NOT v_status_ok THEN 'Status do pedido não permite devolução física'
      WHEN oi.product_id IS NULL THEN 'Item sem product_id'
      WHEN v_order.status = 'cancelled'::public.order_status
           AND EXISTS (
             SELECT 1 FROM public.stock_movements sm
             WHERE sm.order_id = v_order.id
               AND sm.product_id = oi.product_id
               AND sm.movement_type = 'cancel_restore'
           ) THEN 'Estoque já restaurado por cancelamento automático'
      WHEN oi.quantity - COALESCE(r.qty_returned, 0) <= 0 THEN 'Nada restante para devolver'
      ELSE 'ok'
    END
  FROM public.order_items oi
  LEFT JOIN LATERAL (
    SELECT SUM(pri.quantity)::integer AS qty_returned
    FROM public.product_return_items pri
    WHERE pri.order_item_id = oi.id
  ) r ON true
  WHERE oi.order_id = _order_id
  ORDER BY oi.id;
END;
$$;

-- 8) register_physical_return
CREATE OR REPLACE FUNCTION public.register_physical_return(
  _order_id uuid,
  _items jsonb,
  _reason text,
  _notes text DEFAULT NULL
)
RETURNS TABLE (
  return_id uuid,
  order_id uuid,
  items_count integer,
  units_returned integer,
  units_restocked integer,
  units_not_restocked integer,
  financial_pending_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean;
  v_order public.orders%ROWTYPE;
  v_reason text := trim(COALESCE(_reason, ''));
  v_notes text := NULLIF(trim(COALESCE(_notes, '')), '');
  v_return_id uuid;
  v_item jsonb;
  v_order_item public.order_items%ROWTYPE;
  v_product_id uuid;
  v_qty integer;
  v_condition public.return_item_condition;
  v_stock_action public.return_stock_action;
  v_resolution public.return_resolution;
  v_line_reason text;
  v_line_notes text;
  v_confirm_open boolean;
  v_repl_id uuid;
  v_repl_qty integer;
  v_unit_orig numeric(10,2);
  v_unit_repl numeric(10,2);
  v_value_diff numeric(10,2);
  v_returned_so_far integer;
  v_stock_before integer;
  v_stock_after integer;
  v_movement_id uuid;
  v_return_item_id uuid;
  v_items_count integer := 0;
  v_units integer := 0;
  v_restocked integer := 0;
  v_not_restocked integer := 0;
  v_pending numeric(10,2) := 0;
  v_audit_items jsonb := '[]'::jsonb;
  v_open_confirms integer := 0;
  v_sorted jsonb;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem registrar devolução física';
    END IF;
  END IF;

  IF v_reason = '' THEN
    RAISE EXCEPTION 'Motivo da devolução é obrigatório';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um item para devolução';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status NOT IN (
    'paid'::public.order_status,
    'separated'::public.order_status,
    'shipped'::public.order_status,
    'delivered'::public.order_status,
    'refunded'::public.order_status,
    'cancelled'::public.order_status
  ) THEN
    RAISE EXCEPTION 'Status % não permite devolução física', v_order.status;
  END IF;

  IF v_order.status IN ('new'::public.order_status, 'confirmed'::public.order_status) THEN
    RAISE EXCEPTION 'Pedidos new/confirmed não permitem devolução física';
  END IF;

  -- Ordenar por order_item_id para locks estáveis
  SELECT COALESCE(jsonb_agg(elem ORDER BY (elem->>'order_item_id')), '[]'::jsonb)
  INTO v_sorted
  FROM jsonb_array_elements(_items) AS elem;

  INSERT INTO public.product_returns (
    order_id, seller_store_id, reason, notes, status, performed_by,
    financial_pending_amount, financial_pending_notes
  ) VALUES (
    v_order.id,
    v_order.seller_store_id,
    v_reason,
    v_notes,
    'registered',
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    0,
    NULL
  )
  RETURNING id INTO v_return_id;

  FOR v_item IN
    SELECT elem
    FROM jsonb_array_elements(v_sorted) AS elem
  LOOP
    IF (v_item->>'order_item_id') IS NULL THEN
      RAISE EXCEPTION 'order_item_id é obrigatório em cada item';
    END IF;

    SELECT * INTO v_order_item
    FROM public.order_items oi
    WHERE oi.id = (v_item->>'order_item_id')::uuid
    FOR UPDATE;

    IF v_order_item.id IS NULL THEN
      RAISE EXCEPTION 'Item de pedido não encontrado';
    END IF;

    IF v_order_item.order_id IS DISTINCT FROM v_order.id THEN
      RAISE EXCEPTION 'Item % não pertence ao pedido', v_order_item.id;
    END IF;

    IF v_order_item.product_id IS NULL THEN
      RAISE EXCEPTION 'Item % sem product_id; não é possível devolver', v_order_item.id;
    END IF;

    v_product_id := v_order_item.product_id;
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantidade inválida para o item %', v_order_item.id;
    END IF;

    BEGIN
      v_condition := (v_item->>'condition')::public.return_item_condition;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Condição inválida no item %', v_order_item.id;
    END;

    BEGIN
      v_stock_action := (v_item->>'stock_action')::public.return_stock_action;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Ação de estoque inválida no item %', v_order_item.id;
    END;

    BEGIN
      v_resolution := COALESCE(
        NULLIF(v_item->>'resolution', '')::public.return_resolution,
        'devolucao'::public.return_resolution
      );
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Resolução inválida no item %', v_order_item.id;
    END;

    v_line_reason := NULLIF(trim(COALESCE(v_item->>'reason', '')), '');
    v_line_notes := NULLIF(trim(COALESCE(v_item->>'notes', '')), '');
    v_confirm_open := COALESCE((v_item->>'confirm_open_package_restock')::boolean, false);

    -- cancelled + cancel_restore => rejeitar
    IF v_order.status = 'cancelled'::public.order_status
       AND EXISTS (
         SELECT 1 FROM public.stock_movements sm
         WHERE sm.order_id = v_order.id
           AND sm.product_id = v_product_id
           AND sm.movement_type = 'cancel_restore'
       ) THEN
      RAISE EXCEPTION
        'Item % já teve estoque restaurado por cancelamento automático',
        v_order_item.id;
    END IF;

    -- Bloquear restock se já houve cancel_restore (qualquer status)
    IF v_stock_action = 'retornar_ao_estoque'
       AND EXISTS (
         SELECT 1 FROM public.stock_movements sm
         WHERE sm.order_id = v_order.id
           AND sm.product_id = v_product_id
           AND sm.movement_type = 'cancel_restore'
       ) THEN
      RAISE EXCEPTION
        'Não é possível retornar ao estoque: já existe cancel_restore para o produto do item %',
        v_order_item.id;
    END IF;

    IF v_stock_action = 'retornar_ao_estoque'
       AND v_condition NOT IN (
         'perfeito_estado'::public.return_item_condition,
         'embalagem_aberta'::public.return_item_condition
       ) THEN
      RAISE EXCEPTION 'Condição % não permite retornar ao estoque', v_condition;
    END IF;

    IF v_condition = 'embalagem_aberta'::public.return_item_condition
       AND v_stock_action = 'retornar_ao_estoque'
       AND NOT v_confirm_open THEN
      RAISE EXCEPTION
        'Confirmação obrigatória para devolver embalagem aberta ao estoque (item %)',
        v_order_item.id;
    END IF;

    IF v_condition = 'embalagem_aberta'::public.return_item_condition
       AND v_stock_action = 'retornar_ao_estoque'
       AND v_confirm_open THEN
      v_open_confirms := v_open_confirms + 1;
    END IF;

    v_repl_id := NULL;
    v_repl_qty := NULL;
    v_unit_repl := NULL;
    v_value_diff := 0;
    v_unit_orig := v_order_item.unit_price;

    IF v_resolution = 'troca'::public.return_resolution THEN
      IF (v_item->>'replacement_product_id') IS NULL THEN
        RAISE EXCEPTION 'Produto substituto obrigatório na troca (item %)', v_order_item.id;
      END IF;
      v_repl_id := (v_item->>'replacement_product_id')::uuid;
      v_repl_qty := COALESCE((v_item->>'replacement_quantity')::integer, 0);
      IF v_repl_qty < 1 THEN
        RAISE EXCEPTION 'Quantidade do substituto inválida (item %)', v_order_item.id;
      END IF;

      SELECT p.wholesale_price INTO v_unit_repl
      FROM public.products p
      WHERE p.id = v_repl_id;

      IF v_unit_repl IS NULL THEN
        RAISE EXCEPTION 'Produto substituto não encontrado';
      END IF;

      -- Preferir preço enviado só se numérico; ainda assim recalcular no banco
      IF (v_item->>'unit_price_replacement') IS NOT NULL
         AND (v_item->>'unit_price_replacement') ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN
        -- Usa wholesale do banco como fonte da verdade
        NULL;
      END IF;

      v_value_diff := (v_repl_qty::numeric * v_unit_repl)
                   - (v_qty::numeric * v_unit_orig);
    ELSE
      IF (v_item->>'replacement_product_id') IS NOT NULL
         AND NULLIF(v_item->>'replacement_product_id', '') IS NOT NULL THEN
        RAISE EXCEPTION 'Resolução devolucao não aceita produto substituto (item %)', v_order_item.id;
      END IF;
    END IF;

    SELECT COALESCE(SUM(pri.quantity), 0)::integer INTO v_returned_so_far
    FROM public.product_return_items pri
    WHERE pri.order_item_id = v_order_item.id;

    IF v_returned_so_far + v_qty > v_order_item.quantity THEN
      RAISE EXCEPTION
        'Quantidade % ultrapassa o restante (%) do item %',
        v_qty, v_order_item.quantity - v_returned_so_far, v_order_item.id;
    END IF;

    v_movement_id := NULL;
    v_stock_before := NULL;
    v_stock_after := NULL;

    IF v_stock_action = 'retornar_ao_estoque'::public.return_stock_action THEN
      SELECT p.stock INTO v_stock_before
      FROM public.products p
      WHERE p.id = v_product_id
      FOR UPDATE;

      IF v_stock_before IS NULL THEN
        RAISE EXCEPTION 'Produto % não encontrado', v_product_id;
      END IF;

      v_stock_after := v_stock_before + v_qty;

      UPDATE public.products
      SET stock = v_stock_after, updated_at = now()
      WHERE id = v_product_id;

      INSERT INTO public.stock_movements (
        product_id, seller_store_id, order_id, movement_type,
        quantity, quantity_before, quantity_after, performed_by, reason
      ) VALUES (
        v_product_id,
        COALESCE(v_order_item.seller_store_id, v_order.seller_store_id),
        v_order.id,
        'return_restore',
        v_qty,
        v_stock_before,
        v_stock_after,
        auth.uid(),
        COALESCE(v_line_reason, v_reason)
      )
      RETURNING id INTO v_movement_id;

      v_restocked := v_restocked + v_qty;
    ELSE
      v_not_restocked := v_not_restocked + v_qty;
    END IF;

    INSERT INTO public.product_return_items (
      return_id, order_item_id, product_id, quantity,
      condition, stock_action, resolution,
      reason, notes,
      stock_before, stock_after, stock_movement_id,
      replacement_product_id, replacement_quantity,
      unit_price_original, unit_price_replacement, value_difference
    ) VALUES (
      v_return_id,
      v_order_item.id,
      v_product_id,
      v_qty,
      v_condition,
      v_stock_action,
      v_resolution,
      v_line_reason,
      v_line_notes,
      v_stock_before,
      v_stock_after,
      v_movement_id,
      v_repl_id,
      v_repl_qty,
      v_unit_orig,
      v_unit_repl,
      v_value_diff
    )
    RETURNING id INTO v_return_item_id;

    v_items_count := v_items_count + 1;
    v_units := v_units + v_qty;
    v_pending := v_pending + v_value_diff;

    v_audit_items := v_audit_items || jsonb_build_array(jsonb_build_object(
      'return_item_id', v_return_item_id,
      'order_item_id', v_order_item.id,
      'product_id', v_product_id,
      'quantity', v_qty,
      'condition', v_condition,
      'stock_action', v_stock_action,
      'resolution', v_resolution,
      'stock_before', v_stock_before,
      'stock_after', v_stock_after,
      'stock_movement_id', v_movement_id,
      'replacement_product_id', v_repl_id,
      'replacement_quantity', v_repl_qty,
      'unit_price_original', v_unit_orig,
      'unit_price_replacement', v_unit_repl,
      'value_difference', v_value_diff,
      'confirm_open_package_restock', v_confirm_open
    ));
  END LOOP;

  UPDATE public.product_returns
  SET financial_pending_amount = v_pending,
      financial_pending_notes = CASE
        WHEN v_pending <> 0 THEN 'Pendência de troca registrada; sem cobrança/reembolso automático nesta fase'
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = v_return_id;

  PERFORM public.write_audit_log(
    'register_physical_return',
    'product_returns',
    v_return_id::text,
    jsonb_build_object(
      'order_id', v_order.id,
      'order_status', v_order.status,
      'order_total', v_order.total
    ),
    jsonb_build_object(
      'return_id', v_return_id,
      'reason', v_reason,
      'notes', v_notes,
      'items_count', v_items_count,
      'units_returned', v_units,
      'units_restocked', v_restocked,
      'units_not_restocked', v_not_restocked,
      'financial_pending_amount', v_pending,
      'items', v_audit_items
    ),
    jsonb_build_object(
      'source', 'register_physical_return',
      'actor_id', auth.uid(),
      'open_package_restock_confirmations', v_open_confirms,
      'commission_wallet_unchanged', true,
      'order_totals_unchanged', true
    )
  );

  return_id := v_return_id;
  order_id := v_order.id;
  items_count := v_items_count;
  units_returned := v_units;
  units_restocked := v_restocked;
  units_not_restocked := v_not_restocked;
  financial_pending_amount := v_pending;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.register_physical_return(uuid, jsonb, text, text) IS
  'Registra devolução/troca física por item. Restock só via return_restore. Não altera comissão/carteira/totais.';

COMMENT ON FUNCTION public.get_order_return_preview(uuid) IS
  'Prévia admin: quantidades comprada/devolvida/restante e elegibilidade por item.';

COMMENT ON TABLE public.product_returns IS
  'Eventos de devolução física. Independente de cancel/refund financeiro.';

COMMENT ON TABLE public.product_return_items IS
  'Linhas de devolução física: condição, ação de estoque e resolução (devolução/troca) separados.';

-- 9) Grants RPC
REVOKE ALL ON FUNCTION public.get_order_return_preview(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_physical_return(uuid, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_return_preview(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_physical_return(uuid, jsonb, text, text) TO authenticated, service_role;
