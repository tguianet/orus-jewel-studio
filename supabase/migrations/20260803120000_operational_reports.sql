-- =============================================================================
-- Amada Amante — Relatórios operacionais (somente leitura / agregação)
-- Não altera regras de pedidos, estoque, comissões, carteira, saques ou LGPD.
-- Timezone de negócio: America/Sao_Paulo
-- Não aplicar automaticamente nesta fase.
-- =============================================================================

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

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
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
    RETURN NULL; -- indefinido (frontend mostra "—")
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

-- ---------------------------------------------------------------------------
-- 1) Sales summary (admin)
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.admin_get_sales_summary(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_sales_summary(timestamptz, timestamptz, uuid, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Timeseries
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.admin_get_sales_timeseries(timestamptz, timestamptz, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_sales_timeseries(timestamptz, timestamptz, text, uuid, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Order status report
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.admin_get_order_status_report(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_order_status_report(timestamptz, timestamptz, uuid, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Reseller performance
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.admin_get_reseller_performance(timestamptz, timestamptz, int, int, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_reseller_performance(timestamptz, timestamptz, int, int, text, text, text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Commission report
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_commission_report(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_level int DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_total bigint;
  v_items jsonb;
  v_summary jsonb;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  IF p_status IS NOT NULL AND p_status NOT IN ('pending','available','paid','cancelled','reversed') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  -- Schema atual: não há status 'reversed' em commissions — estornos usam 'cancelled'.
  -- 'reversed' no filtro é alias de cancelled; no summary NÃO somamos duas vezes.
  SELECT jsonb_build_object(
    'pending', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
    'available', COALESCE(SUM(amount) FILTER (WHERE status = 'available'), 0),
    'paid', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    'cancelled', COALESCE(SUM(amount) FILTER (WHERE status = 'cancelled'), 0),
    'reversed', 0,
    'reversed_alias_of', 'cancelled'
  )
  INTO v_summary
  FROM public.commissions c
  WHERE c.created_at >= p_start_date AND c.created_at < p_end_date
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_reseller_id IS NULL OR c.reseller_id = p_reseller_id)
    AND (
      p_status IS NULL
      OR (p_status = 'reversed' AND c.status = 'cancelled')
      OR (p_status <> 'reversed' AND c.status = p_status)
    );

  SELECT COUNT(*) INTO v_total
  FROM public.commissions c
  WHERE c.created_at >= p_start_date AND c.created_at < p_end_date
    AND (p_level IS NULL OR c.level = p_level)
    AND (p_reseller_id IS NULL OR c.reseller_id = p_reseller_id)
    AND (
      p_status IS NULL
      OR (p_status = 'reversed' AND c.status = 'cancelled')
      OR (p_status <> 'reversed' AND c.status = p_status)
    );

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT c.id, c.reseller_id, c.order_id, c.level, c.rate, c.amount, c.status, c.created_at
    FROM public.commissions c
    WHERE c.created_at >= p_start_date AND c.created_at < p_end_date
      AND (p_level IS NULL OR c.level = p_level)
      AND (p_reseller_id IS NULL OR c.reseller_id = p_reseller_id)
      AND (
        p_status IS NULL
        OR (p_status = 'reversed' AND c.status = 'cancelled')
        OR (p_status <> 'reversed' AND c.status = p_status)
      )
    ORDER BY c.created_at DESC
    OFFSET (v_page - 1) * v_size
    LIMIT v_size
  ) x;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'items', v_items,
    'page', v_page,
    'page_size', v_size,
    'total_count', v_total,
    'total_pages', GREATEST(1, ceil(v_total::numeric / v_size))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_commission_report(timestamptz, timestamptz, int, text, uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_commission_report(timestamptz, timestamptz, int, text, uuid, int, int)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Wallet report
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_wallet_report(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_reseller_id uuid DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_total bigint;
  v_items jsonb;
  v_summary jsonb;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);

  SELECT jsonb_build_object(
    'by_type', COALESCE(jsonb_object_agg(type, total_amount), '{}'::jsonb),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(status, total_amount)
      FROM (
        SELECT status, SUM(amount)::numeric AS total_amount
        FROM public.wallet_transactions
        WHERE created_at >= p_start_date AND created_at < p_end_date
          AND (p_reseller_id IS NULL OR reseller_id = p_reseller_id)
          AND (p_type IS NULL OR type = p_type)
        GROUP BY status
      ) s
    ), '{}'::jsonb)
  )
  INTO v_summary
  FROM (
    SELECT type, SUM(amount)::numeric AS total_amount
    FROM public.wallet_transactions
    WHERE created_at >= p_start_date AND created_at < p_end_date
      AND (p_reseller_id IS NULL OR reseller_id = p_reseller_id)
      AND (p_type IS NULL OR type = p_type)
    GROUP BY type
  ) t;

  SELECT COUNT(*) INTO v_total
  FROM public.wallet_transactions w
  WHERE w.created_at >= p_start_date AND w.created_at < p_end_date
    AND (p_reseller_id IS NULL OR w.reseller_id = p_reseller_id)
    AND (p_type IS NULL OR w.type = p_type);

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT w.id, w.reseller_id, w.type, w.amount, w.status, w.reason, w.created_at,
           w.commission_id, w.withdrawal_id
    FROM public.wallet_transactions w
    WHERE w.created_at >= p_start_date AND w.created_at < p_end_date
      AND (p_reseller_id IS NULL OR w.reseller_id = p_reseller_id)
      AND (p_type IS NULL OR w.type = p_type)
    ORDER BY w.created_at DESC
    OFFSET (v_page - 1) * v_size
    LIMIT v_size
  ) x;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'items', v_items,
    'page', v_page,
    'page_size', v_size,
    'total_count', v_total,
    'total_pages', GREATEST(1, ceil(v_total::numeric / v_size))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_wallet_report(timestamptz, timestamptz, uuid, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_wallet_report(timestamptz, timestamptz, uuid, text, int, int)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Withdrawal report
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_withdrawal_report(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_status text DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);

  IF to_regclass('public.withdrawal_requests') IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'message', 'Tabela de saques ainda não aplicada'
    );
  END IF;

  EXECUTE $q$
    SELECT jsonb_build_object(
      'requested_count', COUNT(*) FILTER (WHERE true),
      'requested_amount', COALESCE(SUM(amount), 0),
      'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
      'pending_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
      'approved_count', COUNT(*) FILTER (WHERE status = 'approved'),
      'approved_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0),
      'paid_count', COUNT(*) FILTER (WHERE status = 'paid'),
      'paid_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
      'rejected_count', COUNT(*) FILTER (WHERE status = 'rejected'),
      'rejected_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'rejected'), 0),
      'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled'),
      'cancelled_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'cancelled'), 0),
      'blocked_balance', COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','approved')), 0),
      'avg_processing_hours', COALESCE(
        AVG(EXTRACT(EPOCH FROM (paid_at - requested_at)) / 3600.0)
          FILTER (WHERE status = 'paid' AND paid_at IS NOT NULL),
        0
      )
    )
    FROM public.withdrawal_requests
    WHERE requested_at >= $1 AND requested_at < $2
      AND ($3::text IS NULL OR status = $3)
      AND ($4::uuid IS NULL OR reseller_id = $4)
  $q$
  INTO v_result
  USING p_start_date, p_end_date, p_status, p_reseller_id;

  RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object('available', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_withdrawal_report(timestamptz, timestamptz, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_withdrawal_report(timestamptz, timestamptz, text, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Returns report
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_returns_report(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_reseller_id uuid DEFAULT NULL,
  p_product_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);

  RETURN (
    SELECT jsonb_build_object(
      'returns_count', COUNT(DISTINCT pr.id),
      'items_count', COUNT(pri.id),
      'full_returns_count', COUNT(DISTINCT pr.id) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM public.order_items oi
          WHERE oi.order_id = pr.order_id
            AND NOT EXISTS (
              SELECT 1 FROM public.product_return_items x
              JOIN public.product_returns y ON y.id = x.return_id
              WHERE y.order_id = pr.order_id AND x.order_item_id = oi.id
            )
        )
      ),
      'partial_returns_hint', 'Parcial = há itens do pedido sem linha de devolução correspondente',
      'exchange_items', COUNT(*) FILTER (WHERE pri.resolution::text = 'troca'),
      'return_items', COUNT(*) FILTER (WHERE pri.resolution::text = 'devolucao'),
      'stock_restored_qty', COALESCE(SUM(pri.quantity) FILTER (WHERE pri.stock_action::text = 'retornar_ao_estoque'), 0),
      'stock_discarded_qty', COALESCE(SUM(pri.quantity) FILTER (WHERE pri.stock_action::text <> 'retornar_ao_estoque'), 0),
      'financial_returned_amount', COALESCE(SUM(pri.quantity * COALESCE(pri.unit_price_original, 0))
        FILTER (WHERE pri.resolution::text = 'devolucao'), 0),
      'exchange_not_refund', true
    )
    FROM public.product_returns pr
    JOIN public.product_return_items pri ON pri.return_id = pr.id
    LEFT JOIN public.seller_stores ss ON ss.id = pr.seller_store_id
    WHERE pr.created_at >= p_start_date AND pr.created_at < p_end_date
      AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id)
      AND (p_product_id IS NULL OR pri.product_id = p_product_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_returns_report(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_returns_report(timestamptz, timestamptz, uuid, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) Inventory report
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_inventory_report(
  p_stale_days int DEFAULT 30,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 25,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_sort_by text DEFAULT 'stock',
  p_sort_direction text DEFAULT 'asc'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_sort text := lower(COALESCE(p_sort_by, 'stock'));
  v_dir text := lower(COALESCE(p_sort_direction, 'asc'));
  v_stale int := GREATEST(COALESCE(p_stale_days, 30), 1);
  v_total bigint;
  v_items jsonb;
BEGIN
  PERFORM public._report_require_admin();
  IF v_sort NOT IN ('stock','name','code','days_without_sale','immobilized_value') THEN
    RAISE EXCEPTION 'Ordenação inválida';
  END IF;
  IF v_dir NOT IN ('asc','desc') THEN
    RAISE EXCEPTION 'Direção inválida';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _rep_inv (
    product_id uuid,
    name text,
    code text,
    stock int,
    reserved_stock int,
    available_stock int,
    cost_price numeric,
    wholesale_price numeric,
    suggested_price numeric,
    immobilized_value numeric,
    last_sale_at timestamptz,
    days_without_sale int,
    stock_status text,
    cost_informed boolean
  ) ON COMMIT DROP;
  TRUNCATE _rep_inv;

  INSERT INTO _rep_inv
  SELECT
    p.id,
    p.name,
    p.code,
    p.stock,
    COALESCE((
      SELECT SUM(oi.quantity)::int
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = p.id
        AND o.status::text = ANY (public._report_pending_statuses())
        AND (o.expires_at IS NULL OR o.expires_at > now())
    ), 0),
    p.stock,
    p.cost_price,
    p.wholesale_price,
    p.suggested_price,
    CASE WHEN p.cost_price IS NULL THEN NULL ELSE round(p.stock * p.cost_price, 2) END,
    (
      SELECT MAX(o.created_at)
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = p.id
        AND o.status::text = ANY (public._report_paid_statuses())
    ),
    0,
    'normal',
    p.cost_price IS NOT NULL
  FROM public.products p
  WHERE p.status = 'active'
    AND (p_search IS NULL OR p.name ILIKE '%'||trim(p_search)||'%' OR p.code ILIKE '%'||trim(p_search)||'%');

  UPDATE _rep_inv SET
    days_without_sale = CASE
      WHEN last_sale_at IS NULL THEN 99999
      ELSE GREATEST(0, floor(EXTRACT(EPOCH FROM (now() - last_sale_at)) / 86400))::int
    END,
    stock_status = CASE
      WHEN stock <= 0 THEN 'sem_estoque'
      WHEN stock <= 3 THEN 'critico'
      WHEN stock <= 10 THEN 'baixo'
      WHEN last_sale_at IS NULL OR floor(EXTRACT(EPOCH FROM (now() - last_sale_at)) / 86400) >= v_stale THEN 'parado'
      ELSE 'normal'
    END;

  IF p_status IS NOT NULL THEN
    DELETE FROM _rep_inv WHERE stock_status <> p_status;
  END IF;

  SELECT COUNT(*) INTO v_total FROM _rep_inv;

  EXECUTE format(
    $q$
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    FROM (
      SELECT product_id, name, code, stock, reserved_stock, available_stock,
             CASE WHEN cost_informed THEN cost_price ELSE NULL END AS cost_price,
             wholesale_price, suggested_price, immobilized_value, last_sale_at,
             days_without_sale, stock_status, cost_informed,
             CASE WHEN NOT cost_informed THEN 'custo não informado' ELSE NULL END AS cost_label
      FROM _rep_inv
      ORDER BY %I %s, product_id
      OFFSET %s LIMIT %s
    ) t
    $q$,
    CASE v_sort
      WHEN 'name' THEN 'name'
      WHEN 'code' THEN 'code'
      WHEN 'days_without_sale' THEN 'days_without_sale'
      WHEN 'immobilized_value' THEN 'immobilized_value'
      ELSE 'stock'
    END,
    v_dir,
    (v_page - 1) * v_size,
    v_size
  ) INTO v_items;

  RETURN jsonb_build_object(
    'items', v_items,
    'page', v_page,
    'page_size', v_size,
    'total_count', v_total,
    'total_pages', GREATEST(1, ceil(v_total::numeric / v_size)),
    'stale_days', v_stale,
    'notes', jsonb_build_object(
      'available_stock', 'Igual ao stock atual (reserva de checkout já debita o estoque).',
      'reserved_stock', 'Quantidade em pedidos new/confirmed ainda ativos.',
      'margin', 'Não incluída neste relatório; ver top products admin.'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_inventory_report(int, int, int, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_inventory_report(int, int, int, text, text, text, text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10) Top products
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_top_products(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_metric text DEFAULT 'quantity',
  p_limit int DEFAULT 20,
  p_store_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_metric text := lower(COALESCE(p_metric, 'quantity'));
  v_items jsonb;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  IF v_metric NOT IN ('quantity','revenue','net_revenue','returns','estimated_margin','turnover') THEN
    RAISE EXCEPTION 'Métrica inválida';
  END IF;

  WITH sales AS (
    SELECT
      oi.product_id,
      MAX(oi.product_name) AS product_name,
      SUM(oi.quantity) FILTER (WHERE o.status::text = ANY (public._report_paid_statuses())) AS qty_sold,
      COALESCE(SUM(oi.total) FILTER (WHERE o.status::text = ANY (public._report_paid_statuses())), 0) AS revenue
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.created_at >= p_start_date AND o.created_at < p_end_date
      AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
    GROUP BY oi.product_id
  ),
  rets AS (
    SELECT pri.product_id, SUM(pri.quantity)::int AS qty_returned,
           COALESCE(SUM(pri.quantity * COALESCE(pri.unit_price_original, 0))
             FILTER (WHERE pri.resolution::text = 'devolucao'), 0) AS returns_amount
    FROM public.product_return_items pri
    JOIN public.product_returns pr ON pr.id = pri.return_id
    WHERE pr.created_at >= p_start_date AND pr.created_at < p_end_date
    GROUP BY pri.product_id
  ),
  joined AS (
    SELECT
      s.product_id,
      s.product_name,
      COALESCE(s.qty_sold, 0)::int AS quantity_sold,
      s.revenue AS gross_revenue,
      s.revenue - COALESCE(r.returns_amount, 0) AS net_revenue,
      COALESCE(r.qty_returned, 0) AS returns_qty,
      COALESCE(r.returns_amount, 0) AS returns_amount,
      p.cost_price,
      CASE WHEN p.cost_price IS NULL THEN NULL
           ELSE round((s.revenue - COALESCE(r.returns_amount, 0)) - (COALESCE(s.qty_sold, 0) * p.cost_price), 2)
      END AS estimated_margin,
      CASE WHEN p.cost_price IS NULL OR (s.revenue - COALESCE(r.returns_amount, 0)) = 0 THEN NULL
           ELSE round(
             (((s.revenue - COALESCE(r.returns_amount, 0)) - (COALESCE(s.qty_sold, 0) * p.cost_price))
               / NULLIF(s.revenue - COALESCE(r.returns_amount, 0), 0)) * 100
           , 2)
      END AS estimated_margin_pct,
      p.stock AS current_stock,
      CASE WHEN p.stock > 0 THEN round(COALESCE(s.qty_sold, 0)::numeric / p.stock, 2) ELSE NULL END AS turnover
    FROM sales s
    LEFT JOIN rets r ON r.product_id = s.product_id
    LEFT JOIN public.products p ON p.id = s.product_id
  )
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT *
    FROM joined
    ORDER BY
      CASE WHEN v_metric = 'quantity' THEN quantity_sold END DESC NULLS LAST,
      CASE WHEN v_metric = 'revenue' THEN gross_revenue END DESC NULLS LAST,
      CASE WHEN v_metric = 'net_revenue' THEN net_revenue END DESC NULLS LAST,
      CASE WHEN v_metric = 'returns' THEN returns_amount END DESC NULLS LAST,
      CASE WHEN v_metric = 'estimated_margin' THEN estimated_margin END DESC NULLS LAST,
      CASE WHEN v_metric = 'turnover' THEN turnover END DESC NULLS LAST,
      product_id
    LIMIT v_limit
  ) t;

  RETURN jsonb_build_object(
    'metric', v_metric,
    'items', v_items,
    'notes', 'Margem estimada = receita líquida item - (qtd * cost_price). Frete/impostos não incluídos.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_top_products(timestamptz, timestamptz, text, int, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_top_products(timestamptz, timestamptz, text, int, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 11) Expired orders
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_expired_orders_report(
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
  v_expired jsonb;
  v_checkout_base int;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);

  SELECT jsonb_build_object(
    'expired_count', COUNT(*),
    'abandoned_amount', COALESCE(SUM(total), 0),
    'avg_hours_to_expiry', COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(expired_at, expires_at) - created_at)) / 3600.0), 0),
    -- Expiração grava restore como cancel_restore (único tipo válido para esse fluxo)
    'units_released', COALESCE((
      SELECT SUM(ABS(sm.quantity))
      FROM public.stock_movements sm
      JOIN public.orders ox ON ox.id = sm.order_id
      LEFT JOIN public.seller_stores ssx ON ssx.id = ox.seller_store_id
      WHERE sm.movement_type = 'cancel_restore'
        AND ox.expired_at IS NOT NULL
        AND ox.expired_at >= p_start_date AND ox.expired_at < p_end_date
        AND (p_store_id IS NULL OR ox.seller_store_id = p_store_id)
        AND (p_reseller_id IS NULL OR ssx.reseller_id = p_reseller_id)
    ), 0)
  )
  INTO v_expired
  FROM public.orders o
  LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
  WHERE o.expired_at IS NOT NULL
    AND o.expired_at >= p_start_date AND o.expired_at < p_end_date
    AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
    AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id);

  SELECT COUNT(*)::int INTO v_checkout_base
  FROM public.orders o
  LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
  WHERE o.created_at >= p_start_date AND o.created_at < p_end_date
    AND o.origin = 'loja_online'
    AND (p_store_id IS NULL OR o.seller_store_id = p_store_id)
    AND (p_reseller_id IS NULL OR ss.reseller_id = p_reseller_id);

  RETURN v_expired || jsonb_build_object(
    'checkout_orders_base', v_checkout_base,
    'abandonment_rate_pct', CASE
      WHEN v_checkout_base > 0 THEN round(((v_expired->>'expired_count')::numeric / v_checkout_base) * 100, 2)
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_expired_orders_report(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_expired_orders_report(timestamptz, timestamptz, uuid, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 12) Export (tabular JSON, frontend → CSV)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_export_report(
  p_report_type text,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_limit int := 10000;
  v_rows jsonb := '[]'::jsonb;
BEGIN
  PERFORM public._report_require_admin();
  v_start := COALESCE((p_filters->>'start_date')::timestamptz, now() - interval '30 days');
  v_end := COALESCE((p_filters->>'end_date')::timestamptz, now());
  PERFORM public._report_validate_period(v_start, v_end, 366);

  IF p_report_type = 'sales_orders' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT o.id AS order_id, o.status::text AS status, o.total, o.created_at,
             o.seller_store_id AS store_id, ss.store_name
      FROM public.orders o
      LEFT JOIN public.seller_stores ss ON ss.id = o.seller_store_id
      WHERE o.created_at >= v_start AND o.created_at < v_end
      ORDER BY o.created_at DESC
      LIMIT v_limit
    ) x;
  ELSIF p_report_type = 'commissions' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT c.id, c.reseller_id, c.order_id, c.level, c.amount, c.status, c.created_at
      FROM public.commissions c
      WHERE c.created_at >= v_start AND c.created_at < v_end
      ORDER BY c.created_at DESC
      LIMIT v_limit
    ) x;
  ELSIF p_report_type = 'inventory' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT p.id AS product_id, p.code, p.name, p.stock, p.wholesale_price, p.suggested_price,
             p.cost_price, p.status
      FROM public.products p
      ORDER BY p.stock ASC, p.name
      LIMIT v_limit
    ) x;
  ELSIF p_report_type = 'resellers' THEN
    RETURN public.admin_get_reseller_performance(v_start, v_end, 1, 100, 'gross_revenue', 'desc', NULL);
  ELSE
    RAISE EXCEPTION 'Tipo de relatório inválido';
  END IF;

  RETURN jsonb_build_object(
    'report_type', p_report_type,
    'row_count', jsonb_array_length(v_rows),
    'limit', v_limit,
    'truncated', jsonb_array_length(v_rows) >= v_limit,
    'rows', v_rows,
    'excluded_fields', ARRAY['payment_details','checkout_token','customer_address','customer_phone','cost_hash']
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_export_report(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_export_report(text, jsonb)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seller RPCs (escopo próprio)
-- ---------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.seller_get_sales_summary(timestamptz, timestamptz) FROM PUBLIC;
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

REVOKE ALL ON FUNCTION public.seller_get_sales_timeseries(timestamptz, timestamptz, text) FROM PUBLIC;
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

REVOKE ALL ON FUNCTION public.seller_get_commission_summary(timestamptz, timestamptz) FROM PUBLIC;
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

REVOKE ALL ON FUNCTION public.seller_get_order_report(timestamptz, timestamptz, int, int) FROM PUBLIC;
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

REVOKE ALL ON FUNCTION public.seller_export_my_report(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_export_my_report(text, jsonb)
  TO authenticated, service_role;

-- Anon sem acesso
REVOKE ALL ON FUNCTION public.admin_get_sales_summary(timestamptz, timestamptz, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.seller_get_sales_summary(timestamptz, timestamptz) FROM anon;

-- Helpers internos: sem EXECUTE público (usados apenas dentro de SECURITY DEFINER)
REVOKE ALL ON FUNCTION public._report_biz_tz() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_require_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_require_seller() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_validate_period(timestamptz, timestamptz, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_pct_change(numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_paid_statuses() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._report_pending_statuses() FROM PUBLIC, anon, authenticated;
