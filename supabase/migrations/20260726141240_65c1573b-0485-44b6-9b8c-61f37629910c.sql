REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.operational_error_logs FROM authenticated;
GRANT SELECT ON TABLE public.operational_error_logs TO authenticated;

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
  v_txt text;
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
      IF jsonb_typeof(v_val) IN ('object','array') THEN
        CONTINUE;
      ELSIF jsonb_typeof(v_val) = 'string' THEN
        v_txt := regexp_replace(v_val #>> '{}', '<[^>]*>', '', 'g');
        v_txt := replace(replace(v_txt, '<', ''), '>', '');
        v_out := v_out || jsonb_build_object(v_key, left(v_txt, 200));
      ELSE
        v_out := v_out || jsonb_build_object(v_key, v_val);
      END IF;
    END IF;
  END LOOP;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public._sanitize_op_context(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._sanitize_op_context(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public._sanitize_op_context(jsonb) FROM authenticated;