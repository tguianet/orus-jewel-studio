-- =============================================================================
-- Expiração automática de pedidos abandonados (reserva de estoque)
-- Isolada: não altera cancel_paid_order, refund, reverse_mlm, returns, commissions.
-- =============================================================================

-- 1) Colunas em orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS expiration_reason text NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_expiration_coherence_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_expiration_coherence_check CHECK (
    (expired_at IS NULL OR status = 'cancelled'::public.order_status)
    AND (expiration_reason IS NULL OR expired_at IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_orders_expires_at_active
  ON public.orders (expires_at)
  WHERE status IN ('new'::public.order_status, 'confirmed'::public.order_status)
    AND expires_at IS NOT NULL
    AND expired_at IS NULL;

-- 2) Configuração singleton
CREATE TABLE IF NOT EXISTS public.order_reservation_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  reserve_minutes integer NOT NULL DEFAULT 60
    CHECK (reserve_minutes BETWEEN 5 AND 1440),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

INSERT INTO public.order_reservation_settings (id, reserve_minutes)
VALUES (1, 60)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.order_reservation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select order reservation settings" ON public.order_reservation_settings;
CREATE POLICY "Admins can select order reservation settings"
ON public.order_reservation_settings
FOR SELECT
TO authenticated
USING (public.is_admin());

REVOKE ALL ON TABLE public.order_reservation_settings FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.order_reservation_settings FROM authenticated;
GRANT SELECT ON TABLE public.order_reservation_settings TO authenticated;
GRANT ALL ON TABLE public.order_reservation_settings TO service_role;

-- 3) Helper: minutos de reserva
CREATE OR REPLACE FUNCTION public.get_order_reserve_minutes()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.reserve_minutes FROM public.order_reservation_settings s WHERE s.id = 1),
    60
  );
$$;

REVOKE ALL ON FUNCTION public.get_order_reserve_minutes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_reserve_minutes() TO authenticated, service_role, anon;

-- 4) mark_order_paid — rejeita expirado/cancelado (comissões intactas)
CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_had_commissions boolean;
  v_is_service boolean;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role','') = 'service_role';

  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem marcar pedidos como pagos';
    END IF;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status = 'cancelled'::public.order_status
     OR v_order.expired_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pedido cancelado ou expirado não pode ser marcado como pago.';
  END IF;

  IF v_order.status IN ('new'::public.order_status, 'confirmed'::public.order_status)
     AND v_order.expires_at IS NOT NULL
     AND v_order.expires_at <= now() THEN
    RAISE EXCEPTION 'A reserva deste pedido expirou. Crie um novo pedido.';
  END IF;

  IF v_order.status = 'paid'::public.order_status THEN
    SELECT EXISTS (SELECT 1 FROM public.commissions c WHERE c.order_id = _order_id) INTO v_had_commissions;
    PERFORM public.create_mlm_commissions_for_order(_order_id);

    UPDATE public.commissions SET status='available', updated_at=now()
    WHERE order_id = _order_id AND status='pending';

    UPDATE public.wallet_transactions wt SET status='available', updated_at=now()
    FROM public.commissions c
    WHERE wt.commission_id = c.id AND c.order_id = _order_id AND wt.status='pending';

    PERFORM public.write_audit_log(
      'mark_order_paid_idempotent_noop','orders',_order_id::text,
      jsonb_build_object('status',v_order.status,'had_commissions',v_had_commissions),
      jsonb_build_object('status','paid'),
      jsonb_build_object('note','já estava paid; comissões/carteira reconciliadas'));
    RETURN;
  END IF;

  UPDATE public.orders SET status='paid'::public.order_status, updated_at=now()
  WHERE id = _order_id;

  SELECT EXISTS (SELECT 1 FROM public.commissions c WHERE c.order_id = _order_id) INTO v_had_commissions;

  PERFORM public.create_mlm_commissions_for_order(_order_id);

  UPDATE public.commissions SET status='available', updated_at=now()
  WHERE order_id = _order_id AND status='pending';

  UPDATE public.wallet_transactions wt SET status='available', updated_at=now()
  FROM public.commissions c
  WHERE wt.commission_id = c.id AND c.order_id = _order_id AND wt.status='pending';

  PERFORM public.write_audit_log(
    'mark_order_paid','orders',_order_id::text,
    jsonb_build_object('status',v_order.status,'total',v_order.total,'had_commissions',v_had_commissions),
    jsonb_build_object('status','paid'),
    jsonb_build_object('source','mark_order_paid'));
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_paid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO authenticated, service_role;

-- 5) expire_abandoned_orders
CREATE OR REPLACE FUNCTION public.expire_abandoned_orders(
  _limit integer DEFAULT 100
)
RETURNS TABLE (
  expired_count integer,
  units_restored integer,
  order_ids uuid[],
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean;
  v_limit integer := COALESCE(_limit, 100);
  r record;
  v_order public.orders%ROWTYPE;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_details jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_units integer := 0;
  v_batch_units integer;
  v_batch_details jsonb;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente service_role ou admin podem expirar pedidos abandonados';
    END IF;
  END IF;

  IF v_limit < 1 OR v_limit > 500 THEN
    RAISE EXCEPTION '_limit deve estar entre 1 e 500';
  END IF;

  FOR r IN
    SELECT o.id
    FROM public.orders o
    WHERE o.status IN ('new'::public.order_status, 'confirmed'::public.order_status)
      AND o.expires_at IS NOT NULL
      AND o.expires_at <= now()
      AND o.expired_at IS NULL
    ORDER BY o.expires_at ASC
    LIMIT v_limit
    FOR UPDATE OF o SKIP LOCKED
  LOOP
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = r.id;

    -- Revalidação pós-lock
    IF v_order.status NOT IN ('new'::public.order_status, 'confirmed'::public.order_status)
       OR v_order.expires_at IS NULL
       OR v_order.expires_at > now()
       OR v_order.expired_at IS NOT NULL THEN
      CONTINUE;
    END IF;

    PERFORM set_config('app.allow_direct_cancel', 'on', true);
    PERFORM set_config('app.cancel_restore_units', '0', true);
    PERFORM set_config('app.cancel_restore_products', '0', true);
    PERFORM set_config('app.cancel_restore_skipped', '0', true);
    PERFORM set_config('app.cancel_restore_details', '[]', true);

    UPDATE public.orders
    SET status = 'cancelled'::public.order_status,
        expired_at = now(),
        expiration_reason = 'abandoned_checkout_expired',
        updated_at = now()
    WHERE id = v_order.id;

    v_batch_units := COALESCE(NULLIF(current_setting('app.cancel_restore_units', true), '')::integer, 0);
    BEGIN
      v_batch_details := COALESCE(current_setting('app.cancel_restore_details', true), '[]')::jsonb;
    EXCEPTION WHEN others THEN
      v_batch_details := '[]'::jsonb;
    END;

    v_count := v_count + 1;
    v_units := v_units + v_batch_units;
    v_ids := array_append(v_ids, v_order.id);

    v_details := v_details || jsonb_build_array(jsonb_build_object(
      'order_id', v_order.id,
      'previous_status', v_order.status,
      'expires_at', v_order.expires_at,
      'units_restored', v_batch_units,
      'restore_details', v_batch_details
    ));

    PERFORM public.write_audit_log(
      'expire_abandoned_order',
      'orders',
      v_order.id::text,
      jsonb_build_object(
        'status', v_order.status,
        'expires_at', v_order.expires_at,
        'total', v_order.total
      ),
      jsonb_build_object(
        'status', 'cancelled',
        'expired_at', now(),
        'expiration_reason', 'abandoned_checkout_expired',
        'units_restored', v_batch_units
      ),
      jsonb_build_object(
        'source', 'expire_abandoned_orders',
        'commission_wallet_unchanged', true
      )
    );
  END LOOP;

  PERFORM public.write_audit_log(
    'expire_abandoned_orders_batch',
    'orders',
    NULL,
    NULL,
    jsonb_build_object(
      'expired_count', v_count,
      'units_restored', v_units,
      'order_ids', to_jsonb(v_ids),
      'details', v_details
    ),
    jsonb_build_object('source', 'expire_abandoned_orders', 'limit', v_limit)
  );

  expired_count := v_count;
  units_restored := v_units;
  order_ids := v_ids;
  details := v_details;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.expire_abandoned_orders(integer) IS
  'Expira pedidos new/confirmed com expires_at vencido → cancelled + restore líquido. Job Lovable Cloud.';

REVOKE ALL ON FUNCTION public.expire_abandoned_orders(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_abandoned_orders(integer) TO authenticated, service_role;

-- 6) create_public_order — expires_at + token terminal
DROP FUNCTION IF EXISTS public.create_public_order(uuid, text, text, text, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.create_public_order(
  p_seller_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_checkout_token uuid DEFAULT NULL
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

    -- Token ativo: new/confirmed e reserva ainda válida
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

    -- Token terminal / reserva vencida: não reutilizar como checkout ativo
    RAISE EXCEPTION
      'checkout_token já utilizado em pedido encerrado ou com reserva expirada. Gere um novo token e tente novamente.';
  END IF;

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
      seller_store_id,
      customer_name,
      customer_phone,
      customer_address,
      notes,
      subtotal,
      discount,
      total,
      status,
      origin,
      checkout_token,
      expires_at
    ) VALUES (
      p_seller_store_id,
      trim(p_customer_name),
      trim(p_customer_phone),
      NULLIF(trim(COALESCE(p_customer_address, '')), ''),
      NULLIF(trim(COALESCE(p_notes, '')), ''),
      v_subtotal,
      0,
      v_total,
      'new'::public.order_status,
      'loja_online'::public.order_origin,
      p_checkout_token,
      v_expires_at
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
      'reserve_minutes', v_reserve_minutes
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

COMMENT ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb, uuid) IS
  'Checkout público atômico com expires_at (reserva). Token terminal/expirado exige novo token.';

REVOKE ALL ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb, uuid)
  TO anon, authenticated, service_role;
