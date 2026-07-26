CREATE OR REPLACE FUNCTION public.seller_get_sales_summary(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller uuid := public._report_require_seller();
  v_store uuid;
BEGIN
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  SELECT id INTO v_store FROM public.seller_stores WHERE reseller_id = v_reseller LIMIT 1;
  IF v_store IS NULL THEN
    RETURN jsonb_build_object(
      'gross_revenue', 0, 'net_revenue', 0, 'paid_orders_count', 0,
      'pending_orders_count', 0, 'average_ticket', 0, 'returns_amount', 0
    );
  END IF;

  RETURN (
    WITH filtered AS (
      SELECT * FROM public.orders o
      WHERE o.seller_store_id = v_store
        AND o.created_at >= p_start_date AND o.created_at < p_end_date
    ),
    metrics AS (
      SELECT
        COALESCE(SUM(total) FILTER (WHERE status::text = ANY (public._report_paid_statuses())), 0)::numeric AS gross_revenue,
        COALESCE(SUM(total) FILTER (WHERE status::text = 'refunded'), 0)::numeric AS refunded_amount,
        COUNT(*) FILTER (WHERE status::text = ANY (public._report_paid_statuses()))::int AS paid_orders_count,
        COUNT(*) FILTER (WHERE status::text = ANY (public._report_pending_statuses()))::int AS pending_orders_count
      FROM filtered
    ),
    returns_m AS (
      SELECT COALESCE(SUM(pri.quantity * COALESCE(pri.unit_price_original, 0)), 0)::numeric AS returns_amount
      FROM public.product_return_items pri
      JOIN public.product_returns pr ON pr.id = pri.return_id
      WHERE pr.seller_store_id = v_store
        AND pr.created_at >= p_start_date AND pr.created_at < p_end_date
        AND pri.resolution::text = 'devolucao'
    )
    SELECT jsonb_build_object(
      'gross_revenue', m.gross_revenue,
      'net_revenue', m.gross_revenue - m.refunded_amount - r.returns_amount,
      'refunded_amount', m.refunded_amount,
      'returns_amount', r.returns_amount,
      'paid_orders_count', m.paid_orders_count,
      'pending_orders_count', m.pending_orders_count,
      'average_ticket', CASE WHEN m.paid_orders_count > 0
        THEN round((m.gross_revenue - m.refunded_amount - r.returns_amount) / m.paid_orders_count, 2)
        ELSE 0 END,
      'ticket_base', 'net_revenue_over_paid_orders'
    )
    FROM metrics m, returns_m r
  );
END;
$$;

REVOKE ALL ON FUNCTION public.seller_get_sales_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_get_sales_summary(timestamptz, timestamptz)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seller_get_sales_timeseries(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_granularity text DEFAULT 'day'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller uuid := public._report_require_seller();
  v_store uuid;
  v_trunc text;
  v_items jsonb;
BEGIN
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  IF p_granularity NOT IN ('hour','day','week','month') THEN
    RAISE EXCEPTION 'Granularidade inválida';
  END IF;
  v_trunc := p_granularity;
  SELECT id INTO v_store FROM public.seller_stores WHERE reseller_id = v_reseller LIMIT 1;

  WITH bounds AS (
    SELECT
      date_trunc(v_trunc, p_start_date AT TIME ZONE 'America/Sao_Paulo') AS start_local,
      date_trunc(v_trunc, (p_end_date - interval '1 second') AT TIME ZONE 'America/Sao_Paulo') AS end_local
  ),
  series AS (
    SELECT generate_series(b.start_local, b.end_local, ('1 ' || v_trunc)::interval) AS bucket_local
    FROM bounds b
  ),
  agg AS (
    SELECT
      date_trunc(v_trunc, o.created_at AT TIME ZONE 'America/Sao_Paulo') AS bucket_local,
      COALESCE(SUM(o.total) FILTER (WHERE o.status::text = ANY (public._report_paid_statuses())), 0)::numeric AS gross_revenue,
      COUNT(*) FILTER (WHERE o.status::text = ANY (public._report_paid_statuses()))::int AS paid_orders_count
    FROM public.orders o
    WHERE o.seller_store_id = v_store
      AND o.created_at >= p_start_date AND o.created_at < p_end_date
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'bucket', (s.bucket_local AT TIME ZONE 'America/Sao_Paulo'),
      'label', to_char(s.bucket_local, 'DD/MM'),
      'gross_revenue', COALESCE(a.gross_revenue, 0),
      'paid_orders_count', COALESCE(a.paid_orders_count, 0)
    ) ORDER BY s.bucket_local
  ), '[]'::jsonb)
  INTO v_items
  FROM series s
  LEFT JOIN agg a ON a.bucket_local = s.bucket_local;

  RETURN jsonb_build_object('items', v_items, 'timezone', 'America/Sao_Paulo');
END;
$$;

REVOKE ALL ON FUNCTION public.seller_get_sales_timeseries(timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_get_sales_timeseries(timestamptz, timestamptz, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seller_get_commission_summary(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller uuid := public._report_require_seller();
BEGIN
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  RETURN jsonb_build_object(
    'generated', COALESCE((
      SELECT SUM(amount) FROM public.commissions c
      WHERE c.reseller_id = v_reseller
        AND c.created_at >= p_start_date AND c.created_at < p_end_date
        AND c.status IN ('pending','available','paid')
    ), 0),
    'pending', COALESCE((
      SELECT SUM(amount) FROM public.commissions c
      WHERE c.reseller_id = v_reseller
        AND c.created_at >= p_start_date AND c.created_at < p_end_date
        AND c.status = 'pending'
    ), 0),
    'available', COALESCE((SELECT available FROM public.reseller_wallet_summary WHERE reseller_id = v_reseller), 0),
    'paid', COALESCE((SELECT paid FROM public.reseller_wallet_summary WHERE reseller_id = v_reseller), 0),
    'cancelled', COALESCE((
      SELECT SUM(amount) FROM public.commissions c
      WHERE c.reseller_id = v_reseller
        AND c.created_at >= p_start_date AND c.created_at < p_end_date
        AND c.status = 'cancelled'
    ), 0),
    'blocked', COALESCE((SELECT blocked FROM public.reseller_wallet_summary WHERE reseller_id = v_reseller), 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.seller_get_commission_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_get_commission_summary(timestamptz, timestamptz)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seller_get_order_report(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller uuid := public._report_require_seller();
  v_store uuid;
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_total bigint;
  v_items jsonb;
BEGIN
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  SELECT id INTO v_store FROM public.seller_stores WHERE reseller_id = v_reseller LIMIT 1;

  SELECT COUNT(*) INTO v_total
  FROM public.orders o
  WHERE o.seller_store_id = v_store
    AND o.created_at >= p_start_date AND o.created_at < p_end_date;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT o.id AS order_id, o.status::text AS status, o.total, o.created_at, o.origin::text AS origin
    FROM public.orders o
    WHERE o.seller_store_id = v_store
      AND o.created_at >= p_start_date AND o.created_at < p_end_date
    ORDER BY o.created_at DESC
    OFFSET (v_page - 1) * v_size
    LIMIT v_size
  ) x;

  RETURN jsonb_build_object(
    'items', v_items,
    'page', v_page,
    'page_size', v_size,
    'total_count', v_total,
    'total_pages', GREATEST(1, ceil(COALESCE(v_total, 0)::numeric / v_size))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.seller_get_order_report(timestamptz, timestamptz, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_get_order_report(timestamptz, timestamptz, int, int)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seller_export_my_report(
  p_report_type text,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller uuid := public._report_require_seller();
  v_store uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_rows jsonb;
BEGIN
  v_start := COALESCE((p_filters->>'start_date')::timestamptz, now() - interval '30 days');
  v_end := COALESCE((p_filters->>'end_date')::timestamptz, now());
  PERFORM public._report_validate_period(v_start, v_end, 366);
  SELECT id INTO v_store FROM public.seller_stores WHERE reseller_id = v_reseller LIMIT 1;

  IF p_report_type = 'sales_orders' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT o.id AS order_id, o.status::text AS status, o.total, o.created_at
      FROM public.orders o
      WHERE o.seller_store_id = v_store
        AND o.created_at >= v_start AND o.created_at < v_end
      ORDER BY o.created_at DESC
      LIMIT 10000
    ) x;
  ELSIF p_report_type = 'top_products' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT oi.product_id, MAX(oi.product_name) AS product_name,
             SUM(oi.quantity)::int AS quantity_sold,
             COALESCE(SUM(oi.total), 0)::numeric AS revenue
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.seller_store_id = v_store
        AND o.created_at >= v_start AND o.created_at < v_end
        AND o.status::text = ANY (public._report_paid_statuses())
      GROUP BY oi.product_id
      ORDER BY quantity_sold DESC
      LIMIT 500
    ) x;
  ELSE
    RAISE EXCEPTION 'Tipo de relatório inválido';
  END IF;

  RETURN jsonb_build_object(
    'report_type', p_report_type,
    'rows', COALESCE(v_rows, '[]'::jsonb),
    'excluded_fields', ARRAY['cost_price','payment_details','checkout_token','customer_phone','customer_address']
  );
END;
$$;

REVOKE ALL ON FUNCTION public.seller_export_my_report(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_export_my_report(text, jsonb)
  TO authenticated, service_role;