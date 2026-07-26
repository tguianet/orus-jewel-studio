-- Corrige inicialização de totais em create_public_order (SELECT INTO sem linha zera variáveis)
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

  -- Reinicializa variáveis: o SELECT INTO acima as zera (NULL) quando não há linha
  v_order_id := NULL;
  v_subtotal := 0;
  v_total := 0;
  v_created_at := NULL;
  v_status := 'new'::public.order_status;
  v_expires_at := NULL;
  v_expired_at := NULL;

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
    v_subtotal := COALESCE(v_subtotal, 0) + COALESCE(v_line_total, 0);

    UPDATE tmp_public_order_items
    SET product_name = v_product_name,
        unit_price = v_unit_price,
        line_total = v_line_total
    WHERE product_id = v_product_id;
  END LOOP;

  v_subtotal := COALESCE(v_subtotal, 0);
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

REVOKE ALL ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb, uuid, jsonb)
  TO anon, authenticated, service_role;

-- Endurecimento: funções administrativas não devem ser executáveis por visitantes
REVOKE EXECUTE ON FUNCTION public.admin_list_legal_consents(text, text, text, uuid, uuid, text, timestamptz, timestamptz, int, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_legal_documents() FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_legal_document_version(text, text, text, text, timestamptz, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_legal_consent(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_authenticated_consent(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_consents() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_consent_for(text, text) FROM anon;