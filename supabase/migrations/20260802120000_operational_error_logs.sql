-- =============================================================================
-- Amada Amante — Logs operacionais (observabilidade)
-- Não altera regras financeiras. Não aplicar automaticamente nesta fase.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.operational_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text NOT NULL CHECK (length(trim(correlation_id)) >= 8),
  error_code text NOT NULL CHECK (length(trim(error_code)) > 0),
  category text NOT NULL CHECK (category IN (
    'authentication','authorization','validation','network','timeout','database',
    'rpc','checkout','inventory','commission','wallet','withdrawal','return',
    'consent','pwa','unknown'
  )),
  severity text NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  operation text,
  route text,
  entity_type text,
  entity_id uuid,
  actor_user_id uuid,
  actor_role text,
  store_id uuid,
  reseller_id uuid,
  technical_summary text CHECK (technical_summary IS NULL OR length(technical_summary) <= 500),
  sanitized_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent_hash text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_errors_correlation
  ON public.operational_error_logs (correlation_id);
CREATE INDEX IF NOT EXISTS idx_op_errors_occurred
  ON public.operational_error_logs (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_op_errors_severity
  ON public.operational_error_logs (severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_op_errors_category
  ON public.operational_error_logs (category);
CREATE INDEX IF NOT EXISTS idx_op_errors_code
  ON public.operational_error_logs (error_code);
CREATE INDEX IF NOT EXISTS idx_op_errors_unresolved
  ON public.operational_error_logs (occurred_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.operational_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "op_errors_admin_select" ON public.operational_error_logs;
CREATE POLICY "op_errors_admin_select"
  ON public.operational_error_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE ALL ON TABLE public.operational_error_logs FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.operational_error_logs TO authenticated;
GRANT ALL ON TABLE public.operational_error_logs TO service_role;

-- Rate limit simples por ator (últimos 60s)
CREATE OR REPLACE FUNCTION public._op_error_rate_ok()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.operational_error_logs
  WHERE occurred_at > now() - interval '60 seconds'
    AND (
      (auth.uid() IS NOT NULL AND actor_user_id = auth.uid())
      OR (auth.uid() IS NULL AND actor_user_id IS NULL AND route IS NOT DISTINCT FROM current_setting('request.path', true))
    );
  RETURN v_count < 20;
END;
$$;

CREATE OR REPLACE FUNCTION public._sanitize_op_context(p_context jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_allowed text[] := ARRAY[
    'order_id','withdrawal_id','return_id','reseller_id','store_id','rpc_name',
    'route','operation','status','http_status','error_code','correlation_id',
    'entity_type','entity_id','severity','category','code','retryable','page','page_size',
    'actor_role'
  ];
BEGIN
  IF p_context IS NULL OR jsonb_typeof(p_context) <> 'object' THEN
    RETURN '{}'::jsonb;
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_context)
  LOOP
    IF v_key = ANY (v_allowed) THEN
      IF jsonb_typeof(v_val) = 'string' AND length(v_val #>> '{}') > 200 THEN
        v_out := v_out || jsonb_build_object(v_key, left(v_val #>> '{}', 200));
      ELSE
        v_out := v_out || jsonb_build_object(v_key, v_val);
      END IF;
    END IF;
  END LOOP;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_operational_error(
  p_correlation_id text,
  p_error_code text,
  p_category text,
  p_severity text,
  p_operation text DEFAULT NULL,
  p_route text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_role text;
  v_summary text;
BEGIN
  IF p_correlation_id IS NULL OR length(trim(p_correlation_id)) < 8 THEN
    RAISE EXCEPTION 'correlation_id inválido';
  END IF;
  IF p_error_code IS NULL OR length(trim(p_error_code)) = 0 THEN
    RAISE EXCEPTION 'error_code inválido';
  END IF;
  IF p_severity NOT IN ('info','warning','error','critical') THEN
    RAISE EXCEPTION 'severity inválida';
  END IF;
  IF p_category NOT IN (
    'authentication','authorization','validation','network','timeout','database',
    'rpc','checkout','inventory','commission','wallet','withdrawal','return',
    'consent','pwa','unknown'
  ) THEN
    RAISE EXCEPTION 'category inválida';
  END IF;

  -- Anon só pode reportar categorias limitadas
  IF auth.uid() IS NULL AND p_category NOT IN ('checkout','network','timeout','consent','pwa','unknown','validation') THEN
    RAISE EXCEPTION 'Categoria não permitida para anônimo';
  END IF;

  IF NOT public._op_error_rate_ok() THEN
    RAISE EXCEPTION 'Rate limit de relatório excedido';
  END IF;

  v_role := CASE
    WHEN auth.uid() IS NULL THEN 'anon'
    WHEN public.is_admin(auth.uid()) THEN 'admin'
    ELSE 'sacoleira'
  END;

  v_summary := left(COALESCE(p_error_code || ' @ ' || COALESCE(p_operation, p_route, 'n/a'), p_error_code), 500);

  INSERT INTO public.operational_error_logs (
    correlation_id, error_code, category, severity, operation, route,
    entity_type, entity_id, actor_user_id, actor_role,
    technical_summary, sanitized_context, user_agent_hash
  ) VALUES (
    trim(p_correlation_id), trim(p_error_code), p_category, p_severity,
    NULLIF(trim(COALESCE(p_operation, '')), ''),
    NULLIF(trim(COALESCE(p_route, '')), ''),
    NULLIF(trim(COALESCE(p_entity_type, '')), ''),
    p_entity_id,
    auth.uid(),
    v_role,
    v_summary,
    public._sanitize_op_context(p_context),
    CASE WHEN length(COALESCE(current_setting('request.headers', true), '')) > 0
      THEN encode(digest(current_setting('request.headers', true), 'sha256'), 'hex')
      ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.report_operational_error(text, text, text, text, text, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_operational_error(text, text, text, text, text, text, text, uuid, jsonb)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_operational_errors(
  p_severity text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_route text DEFAULT NULL,
  p_operation text DEFAULT NULL,
  p_resolved boolean DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_total bigint;
  v_items jsonb;
  v_stats jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.operational_error_logs e
  WHERE (p_severity IS NULL OR e.severity = p_severity)
    AND (p_category IS NULL OR e.category = p_category)
    AND (p_error_code IS NULL OR e.error_code = p_error_code)
    AND (p_route IS NULL OR e.route ILIKE '%' || p_route || '%')
    AND (p_operation IS NULL OR e.operation ILIKE '%' || p_operation || '%')
    AND (p_resolved IS NULL OR (p_resolved = true AND e.resolved_at IS NOT NULL) OR (p_resolved = false AND e.resolved_at IS NULL))
    AND (p_date_from IS NULL OR e.occurred_at >= p_date_from)
    AND (p_date_to IS NULL OR e.occurred_at <= p_date_to);

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.occurred_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT id, correlation_id, error_code, category, severity, operation, route,
           entity_type, entity_id, occurred_at, resolved_at, technical_summary
    FROM public.operational_error_logs e
    WHERE (p_severity IS NULL OR e.severity = p_severity)
      AND (p_category IS NULL OR e.category = p_category)
      AND (p_error_code IS NULL OR e.error_code = p_error_code)
      AND (p_route IS NULL OR e.route ILIKE '%' || p_route || '%')
      AND (p_operation IS NULL OR e.operation ILIKE '%' || p_operation || '%')
      AND (p_resolved IS NULL OR (p_resolved = true AND e.resolved_at IS NOT NULL) OR (p_resolved = false AND e.resolved_at IS NULL))
      AND (p_date_from IS NULL OR e.occurred_at >= p_date_from)
      AND (p_date_to IS NULL OR e.occurred_at <= p_date_to)
    ORDER BY e.occurred_at DESC
    OFFSET (v_page - 1) * v_size
    LIMIT v_size
  ) x;

  SELECT jsonb_build_object(
    'critical', count(*) FILTER (WHERE severity = 'critical' AND resolved_at IS NULL),
    'error', count(*) FILTER (WHERE severity = 'error' AND resolved_at IS NULL),
    'warning', count(*) FILTER (WHERE severity = 'warning' AND resolved_at IS NULL),
    'resolved', count(*) FILTER (WHERE resolved_at IS NOT NULL)
  )
  INTO v_stats
  FROM public.operational_error_logs;

  RETURN jsonb_build_object('items', v_items, 'total', v_total, 'page', v_page, 'page_size', v_size, 'stats', v_stats);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_operational_errors(text, text, text, text, text, boolean, timestamptz, timestamptz, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_operational_errors(text, text, text, text, text, boolean, timestamptz, timestamptz, int, int)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_operational_error(p_error_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.operational_error_logs%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  SELECT * INTO v_row FROM public.operational_error_logs WHERE id = p_error_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'correlation_id', v_row.correlation_id,
    'error_code', v_row.error_code,
    'category', v_row.category,
    'severity', v_row.severity,
    'operation', v_row.operation,
    'route', v_row.route,
    'entity_type', v_row.entity_type,
    'entity_id', v_row.entity_id,
    'actor_role', v_row.actor_role,
    'technical_summary', v_row.technical_summary,
    'sanitized_context', v_row.sanitized_context,
    'occurred_at', v_row.occurred_at,
    'resolved_at', v_row.resolved_at,
    'resolution_notes', v_row.resolution_notes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_operational_error(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_operational_error(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_resolve_operational_error(
  p_error_id uuid,
  p_resolution_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores';
  END IF;

  UPDATE public.operational_error_logs
  SET resolved_at = COALESCE(resolved_at, now()),
      resolved_by = auth.uid(),
      resolution_notes = NULLIF(trim(COALESCE(p_resolution_notes, '')), '')
  WHERE id = p_error_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado';
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', p_error_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_operational_error(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_operational_error(uuid, text)
  TO authenticated, service_role;
