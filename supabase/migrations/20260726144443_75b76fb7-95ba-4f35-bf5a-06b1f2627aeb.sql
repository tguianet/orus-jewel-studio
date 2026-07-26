-- Índices auxiliares (somente se ausentes)
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_created_at
  ON public.orders (seller_store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_commissions_reseller_status_created
  ON public.commissions (reseller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_reseller_created
  ON public.wallet_transactions (reseller_id, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.withdrawal_requests') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_reseller_status_req
      ON public.withdrawal_requests (reseller_id, status, requested_at DESC)';
  END IF;
  IF to_regclass('public.product_returns') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_product_returns_created
      ON public.product_returns (created_at DESC)';
  END IF;
  IF to_regclass('public.product_return_items') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_product_return_items_product
      ON public.product_return_items (product_id)';
  END IF;
END $$;

-- Helpers
CREATE OR REPLACE FUNCTION public._report_biz_tz()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 'America/Sao_Paulo'::text $$;

CREATE OR REPLACE FUNCTION public._report_require_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._report_require_seller()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  v_id := public.current_reseller_id(auth.uid());
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de sacoleira não encontrado';
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._report_validate_period(
  p_start timestamptz,
  p_end timestamptz,
  p_max_days int DEFAULT 366
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_start IS NULL OR p_end IS NULL THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'Data final deve ser maior que a inicial';
  END IF;
  IF (p_end - p_start) > make_interval(days => GREATEST(p_max_days, 1)) THEN
    RAISE EXCEPTION 'Período máximo excedido (% dias)', p_max_days;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._report_pct_change(p_current numeric, p_previous numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_previous IS NULL OR p_previous = 0 THEN
    IF p_current IS NULL OR p_current = 0 THEN
      RETURN 0;
    END IF;
    RETURN NULL;
  END IF;
  RETURN round(((p_current - p_previous) / abs(p_previous)) * 100, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public._report_paid_statuses()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$ SELECT ARRAY['paid','separated','shipped','delivered']::text[] $$;

CREATE OR REPLACE FUNCTION public._report_pending_statuses()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$ SELECT ARRAY['new','confirmed']::text[] $$;

REVOKE ALL ON FUNCTION public._report_biz_tz() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_require_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_require_seller() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_validate_period(timestamptz, timestamptz, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_pct_change(numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_paid_statuses() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_pending_statuses() FROM PUBLIC, anon, authenticated;

-- 1) Sales summary (admin)
CREATE OR REPLACE FUNCTION public.admin_get_sales_summary(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_store_id uuid DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_start timestamptz;
  v_prev_end timestamptz;
  v_dur interval;
  v_cur jsonb;
  v_prev jsonb;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  v_dur := p_end_date - p_start_date;
  v_prev_end := p_start_date;
  v_prev_start := p_start_date - v_dur;

  WITH filtered AS (
    SELECT o.*
    FROM public.orders o
    LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
    WHERE o.created_at >= p_start_date AND o.created_at < p_end_date
      AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
      AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id)
  ),
  metrics AS (
    SELECT
      COALESCE(SUM(total) FILTER (WHERE status::text = ANY (public._report_paid_statuses())), 0)::numeric AS gross_revenue,
      COALESCE(SUM(total) FILTER (WHERE status::text = 'refunded'), 0)::numeric AS refunded_amount,
      COALESCE(SUM(total) FILTER (WHERE status::text = 'cancelled'), 0)::numeric AS cancelled_amount,
      COUNT(*) FILTER (WHERE status::text = ANY (public._report_paid_statuses()))::int AS paid_orders_count,
      COUNT(*) FILTER (WHERE status::text = ANY (public._report_pending_statuses()))::int AS pending_orders_count,
      COUNT(*) FILTER (WHERE status::text = 'cancelled')::int AS cancelled_orders_count,
      COUNT(*) FILTER (WHERE status::text = 'refunded')::int AS refunded_orders_count
    FROM filtered
  ),
  returns_m AS (
    SELECT COALESCE(SUM(pri.quantity * COALESCE(pri.unit_price_original, 0)), 0)::numeric AS returns_amount
    FROM public.product_return_items pri
    JOIN public.product_returns pr ON pr.id = pri.return_id
    LEFT JOIN public.seller_stores ss ON ss.id = pr.seller_store_id
    WHERE pr.created_at >= p_start_date AND pr.created_at < p_end_date
      AND pri.resolution::text = 'devolucao'
      AND (p_store_id IS NULL OR pr.seller_store_id = p_store_id)
      AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id)
  )
  SELECT jsonb_build_object(
    'gross_revenue', m.gross_revenue,
    'refunded_amount', m.refunded_amount,
    'cancelled_amount', m.cancelled_amount,
    'returns_amount', r.returns_amount,
    'net_revenue', m.gross_revenue - m.refunded_amount - r.returns_amount,
    'paid_orders_count', m.paid_orders_count,
    'pending_orders_count', m.pending_orders_count,
    'cancelled_orders_count', m.cancelled_orders_count,
    'refunded_orders_count', m.refunded_orders_count,
    'average_ticket', CASE WHEN m.paid_orders_count > 0
      THEN round((m.gross_revenue - m.refunded_amount - r.returns_amount) / m.paid_orders_count, 2)
      ELSE 0 END,
    'ticket_base', 'net_revenue_over_paid_orders',
    'period_start', p_start_date,
    'period_end', p_end_date
  )
  INTO v_cur
  FROM metrics m, returns_m r;

  WITH filtered AS (
    SELECT o.*
    FROM public.orders o
    LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
    WHERE o.created_at >= v_prev_start AND o.created_at < v_prev_end
      AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
      AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id)
  ),
  metrics AS (
    SELECT
      COALESCE(SUM(total) FILTER (WHERE status::text = ANY (public._report_paid_statuses())), 0)::numeric AS gross_revenue,
      COALESCE(SUM(total) FILTER (WHERE status::text = 'refunded'), 0)::numeric AS refunded_amount,
      COUNT(*) FILTER (WHERE status::text = ANY (public._report_paid_statuses()))::int AS paid_orders_count
    FROM filtered
  ),
  returns_m AS (
    SELECT COALESCE(SUM(pri.quantity * COALESCE(pri.unit_price_original, 0)), 0)::numeric AS returns_amount
    FROM public.product_return_items pri
    JOIN public.product_returns pr ON pr.id = pri.return_id
    LEFT JOIN public.seller_stores ss ON ss.id = pr.seller_store_id
    WHERE pr.created_at >= v_prev_start AND pr.created_at < v_prev_end
      AND pri.resolution::text = 'devolucao'
      AND (p_store_id IS NULL OR pr.seller_store_id = p_store_id)
      AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id)
  )
  SELECT jsonb_build_object(
    'gross_revenue', m.gross_revenue,
    'net_revenue', m.gross_revenue - m.refunded_amount - r.returns_amount,
    'paid_orders_count', m.paid_orders_count,
    'average_ticket', CASE WHEN m.paid_orders_count > 0
      THEN round((m.gross_revenue - m.refunded_amount - r.returns_amount) / m.paid_orders_count, 2)
      ELSE 0 END
  )
  INTO v_prev
  FROM metrics m, returns_m r;

  RETURN v_cur || jsonb_build_object(
    'previous', v_prev,
    'comparison_percentages', jsonb_build_object(
      'gross_revenue', public._report_pct_change((v_cur->>'gross_revenue')::numeric, (v_prev->>'gross_revenue')::numeric),
      'net_revenue', public._report_pct_change((v_cur->>'net_revenue')::numeric, (v_prev->>'net_revenue')::numeric),
      'paid_orders_count', public._report_pct_change((v_cur->>'paid_orders_count')::numeric, (v_prev->>'paid_orders_count')::numeric),
      'average_ticket', public._report_pct_change((v_cur->>'average_ticket')::numeric, (v_prev->>'average_ticket')::numeric)
    ),
    'definitions', jsonb_build_object(
      'gross_revenue', 'Soma dos totais de pedidos em paid/separated/shipped/delivered no período (por created_at).',
      'net_revenue', 'gross_revenue - refunded_amount - returns_amount (somente resolution=devolucao). Trocas não descontam.',
      'average_ticket', 'net_revenue / paid_orders_count'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_sales_summary(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_sales_summary(timestamptz, timestamptz, uuid, uuid)
  TO authenticated, service_role;

-- 2) Timeseries
CREATE OR REPLACE FUNCTION public.admin_get_sales_timeseries(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_granularity text DEFAULT 'day',
  p_store_id uuid DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trunc text;
  v_items jsonb;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  IF p_granularity NOT IN ('hour', 'day', 'week', 'month') THEN
    RAISE EXCEPTION 'Granularidade inválida';
  END IF;
  v_trunc := p_granularity;

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
    LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
    WHERE o.created_at >= p_start_date AND o.created_at < p_end_date
      AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
      AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id)
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'bucket', (s.bucket_local AT TIME ZONE 'America/Sao_Paulo'),
      'label', to_char(s.bucket_local, CASE v_trunc
        WHEN 'hour' THEN 'DD/MM HH24:00'
        WHEN 'day' THEN 'DD/MM'
        WHEN 'week' THEN 'IYYY-"W"IW'
        ELSE 'MM/YYYY' END),
      'gross_revenue', COALESCE(a.gross_revenue, 0),
      'paid_orders_count', COALESCE(a.paid_orders_count, 0)
    ) ORDER BY s.bucket_local
  ), '[]'::jsonb)
  INTO v_items
  FROM series s
  LEFT JOIN agg a ON a.bucket_local = s.bucket_local;

  RETURN jsonb_build_object(
    'granularity', p_granularity,
    'timezone', 'America/Sao_Paulo',
    'items', v_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_sales_timeseries(timestamptz, timestamptz, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_sales_timeseries(timestamptz, timestamptz, text, uuid, uuid)
  TO authenticated, service_role;

-- 3) Order status report
CREATE OR REPLACE FUNCTION public.admin_get_order_status_report(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_store_id uuid DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'status', x.status,
      'orders_count', x.orders_count,
      'amount', x.amount
    ) ORDER BY x.orders_count DESC
  ), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT o.status::text AS status,
           COUNT(*)::int AS orders_count,
           COALESCE(SUM(o.total), 0)::numeric AS amount
    FROM public.orders o
    LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
    WHERE o.created_at >= p_start_date AND o.created_at < p_end_date
      AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
      AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id)
    GROUP BY o.status
  ) x;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_order_status_report(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_order_status_report(timestamptz, timestamptz, uuid, uuid)
  TO authenticated, service_role;

-- 4) Reseller performance
CREATE OR REPLACE FUNCTION public.admin_get_reseller_performance(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 25,
  p_sort_by text DEFAULT 'gross_revenue',
  p_sort_direction text DEFAULT 'desc',
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_sort text := lower(COALESCE(p_sort_by, 'gross_revenue'));
  v_dir text := lower(COALESCE(p_sort_direction, 'desc'));
  v_total bigint;
  v_items jsonb;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  IF v_sort NOT IN ('gross_revenue','net_revenue','paid_orders','average_ticket','commission_generated','store_name') THEN
    RAISE EXCEPTION 'Ordenação inválida';
  END IF;
  IF v_dir NOT IN ('asc','desc') THEN
    RAISE EXCEPTION 'Direção de ordenação inválida';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _rep_reseller_perf (
    reseller_id uuid,
    reseller_name text,
    store_id uuid,
    store_name text,
    paid_orders int,
    gross_revenue numeric,
    net_revenue numeric,
    average_ticket numeric,
    commission_generated numeric,
    commission_available numeric,
    commission_paid numeric,
    returns_count int,
    cancelled_orders int
  ) ON COMMIT DROP;
  TRUNCATE _rep_reseller_perf;

  INSERT INTO _rep_reseller_perf
  SELECT
    r.id,
    COALESCE(p.display_name, r.id::text),
    ss.id,
    COALESCE(ss.store_name, 'Sem loja'),
    COUNT(o.id) FILTER (WHERE o.status::text = ANY (public._report_paid_statuses())),
    COALESCE(SUM(o.total) FILTER (WHERE o.status::text = ANY (public._report_paid_statuses())), 0),
    COALESCE(SUM(o.total) FILTER (WHERE o.status::text = ANY (public._report_paid_statuses())), 0)
      - COALESCE(SUM(o.total) FILTER (WHERE o.status::text = 'refunded'), 0),
    0,
    COALESCE((
      SELECT SUM(c.amount) FROM public.commissions c
      WHERE c.reseller_id = r.id AND c.created_at >= p_start_date AND c.created_at < p_end_date
        AND c.status IN ('pending','available','paid')
    ), 0),
    COALESCE((
      SELECT SUM(w.available) FROM public.reseller_wallet_summary w WHERE w.reseller_id = r.id
    ), 0),
    COALESCE((
      SELECT SUM(w.paid) FROM public.reseller_wallet_summary w WHERE w.reseller_id = r.id
    ), 0),
    COALESCE((
      SELECT COUNT(*) FROM public.product_returns pr
      WHERE pr.seller_store_id = ss.id AND pr.created_at >= p_start_date AND pr.created_at < p_end_date
    ), 0)::int,
    COUNT(o.id) FILTER (WHERE o.status::text = 'cancelled')::int
  FROM public.resellers r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  LEFT JOIN public.seller_stores ss ON ss.reseller_id = r.id
  LEFT JOIN public.orders o ON o.seller_store_id = ss.id
    AND o.created_at >= p_start_date AND o.created_at < p_end_date
  WHERE (
    p_search IS NULL OR length(trim(p_search)) = 0
    OR ss.store_name ILIKE '%' || trim(p_search) || '%'
    OR COALESCE(p.display_name, '') ILIKE '%' || trim(p_search) || '%'
  )
  GROUP BY r.id, p.display_name, ss.id, ss.store_name;

  UPDATE _rep_reseller_perf
  SET average_ticket = CASE WHEN paid_orders > 0 THEN round(net_revenue / paid_orders, 2) ELSE 0 END,
      net_revenue = GREATEST(net_revenue, 0);

  SELECT COUNT(*) INTO v_total FROM _rep_reseller_perf;

  EXECUTE format(
    $q$
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    FROM (
      SELECT reseller_id, reseller_name, store_id, store_name, paid_orders, gross_revenue,
             net_revenue, average_ticket, commission_generated, commission_available,
             commission_paid, returns_count, cancelled_orders,
             row_number() OVER (ORDER BY %I %s, reseller_id) AS ranking
      FROM _rep_reseller_perf
      ORDER BY %I %s, reseller_id
      OFFSET %s LIMIT %s
    ) t
    $q$,
    v_sort, v_dir, v_sort, v_dir, (v_page - 1) * v_size, v_size
  ) INTO v_items;

  RETURN jsonb_build_object(
    'items', v_items,
    'page', v_page,
    'page_size', v_size,
    'total_count', v_total,
    'total_pages', GREATEST(1, ceil(v_total::numeric / v_size))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_reseller_performance(timestamptz, timestamptz, int, int, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_reseller_performance(timestamptz, timestamptz, int, int, text, text, text)
  TO authenticated, service_role;