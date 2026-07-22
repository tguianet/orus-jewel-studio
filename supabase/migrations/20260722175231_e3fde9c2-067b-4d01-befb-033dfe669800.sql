CREATE OR REPLACE FUNCTION public.create_public_order(
  p_seller_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  order_id uuid,
  status public.order_status,
  subtotal numeric,
  total numeric,
  created_at timestamptz
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
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_product_name text;
  v_unit_price numeric(10,2);
  v_line_total numeric(10,2);
  v_product_status public.product_status;
  v_link_active boolean;
  v_dup_count integer;
  v_item_count integer;
  c_max_qty_per_item constant integer := 99;
  c_max_distinct_items constant integer := 50;
BEGIN
  IF p_seller_store_id IS NULL THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;

  IF p_customer_phone IS NULL OR length(trim(p_customer_phone)) < 8 THEN
    RAISE EXCEPTION 'Telefone do cliente é obrigatório';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Lista de itens inválida';
  END IF;

  v_item_count := jsonb_array_length(p_items);
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio';
  END IF;

  IF v_item_count > c_max_distinct_items THEN
    RAISE EXCEPTION 'Limite de % itens por pedido excedido', c_max_distinct_items;
  END IF;

  SELECT public.is_approved_store(p_seller_store_id) INTO v_store_ok;
  IF NOT COALESCE(v_store_ok, false) THEN
    RAISE EXCEPTION 'Loja indisponível ou não aprovada';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS el
    WHERE el ? 'unit_price'
       OR el ? 'total'
       OR el ? 'subtotal'
       OR el ? 'status'
       OR el ? 'cost_price'
       OR el ? 'wholesale_price'
       OR el ? 'commission'
  ) THEN
    RAISE EXCEPTION 'Preços e status não podem ser enviados pelo cliente';
  END IF;

  CREATE TEMP TABLE tmp_public_order_items (
    product_id uuid PRIMARY KEY,
    quantity integer NOT NULL CHECK (quantity > 0)
  ) ON COMMIT DROP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF v_item->>'product_id' IS NULL OR length(trim(v_item->>'product_id')) = 0 THEN
      RAISE EXCEPTION 'Item sem product_id';
    END IF;

    BEGIN
      v_product_id := (v_item->>'product_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'product_id inválido';
    END;

    BEGIN
      v_qty := (v_item->>'quantity')::integer;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Quantidade inválida para o produto %', v_product_id;
    END;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantidade deve ser maior que zero';
    END IF;

    IF v_qty > c_max_qty_per_item THEN
      RAISE EXCEPTION 'Quantidade máxima por item é %', c_max_qty_per_item;
    END IF;

    INSERT INTO tmp_public_order_items (product_id, quantity)
    VALUES (v_product_id, v_qty)
    ON CONFLICT (product_id) DO UPDATE
      SET quantity = tmp_public_order_items.quantity + EXCLUDED.quantity;

    SELECT quantity INTO v_qty
    FROM tmp_public_order_items
    WHERE product_id = v_product_id;

    IF v_qty > c_max_qty_per_item THEN
      RAISE EXCEPTION 'Quantidade consolidada excede o máximo de % para o produto %',
        c_max_qty_per_item, v_product_id;
    END IF;
  END LOOP;

  SELECT count(*)::integer INTO v_dup_count FROM tmp_public_order_items;
  IF v_dup_count = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio após validação';
  END IF;

  FOR v_product_id, v_qty IN
    SELECT t.product_id, t.quantity FROM tmp_public_order_items t
  LOOP
    SELECT p.name, p.status, sp.active,
           COALESCE(sp.resale_price, p.suggested_price)
      INTO v_product_name, v_product_status, v_link_active, v_unit_price
    FROM public.products p
    INNER JOIN public.store_products sp
      ON sp.product_id = p.id
     AND sp.seller_store_id = p_seller_store_id
    WHERE p.id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto % não está disponível nesta loja', v_product_id;
    END IF;

    IF v_product_status IS DISTINCT FROM 'active'::public.product_status THEN
      RAISE EXCEPTION 'Produto "%" está inativo', v_product_name;
    END IF;

    IF COALESCE(v_link_active, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Produto "%" não está liberado nesta loja', v_product_name;
    END IF;

    IF v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'Preço inválido para o produto "%"', v_product_name;
    END IF;

    v_line_total := round(v_unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  v_total := v_subtotal;

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
    origin
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
    'loja_online'::public.order_origin
  )
  RETURNING id, orders.status, orders.subtotal, orders.total, orders.created_at
  INTO v_order_id, v_status, v_subtotal, v_total, v_created_at;

  FOR v_product_id, v_qty IN
    SELECT t.product_id, t.quantity FROM tmp_public_order_items t
  LOOP
    SELECT p.name, COALESCE(sp.resale_price, p.suggested_price)
      INTO v_product_name, v_unit_price
    FROM public.products p
    INNER JOIN public.store_products sp
      ON sp.product_id = p.id
     AND sp.seller_store_id = p_seller_store_id
     AND sp.active = true
    WHERE p.id = v_product_id
      AND p.status = 'active'::public.product_status;

    v_line_total := round(v_unit_price * v_qty, 2);

    INSERT INTO public.order_items (
      order_id,
      seller_store_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total
    ) VALUES (
      v_order_id,
      p_seller_store_id,
      v_product_id,
      v_product_name,
      v_qty,
      v_unit_price,
      v_line_total
    );
  END LOOP;

  RETURN QUERY
  SELECT v_order_id, v_status, v_subtotal, v_total, v_created_at;
END;
$$;

COMMENT ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb) IS
  'Checkout público atômico: cria pedido + itens com preços do banco. Status sempre new.';

REVOKE ALL ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, text, text, text, text, jsonb) TO service_role;