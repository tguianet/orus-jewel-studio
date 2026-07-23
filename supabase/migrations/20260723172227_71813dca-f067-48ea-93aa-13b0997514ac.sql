CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_nonempty CHECK (length(trim(action)) > 0),
  CONSTRAINT audit_logs_entity_type_nonempty CHECK (length(trim(entity_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.audit_logs FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select audit logs" ON public.audit_logs;
CREATE POLICY "Admins can select audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_entity text,
  p_entity_id text DEFAULT NULL,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_meta jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  v_meta := v_meta - 'password' - 'access_token' - 'refresh_token'
            - 'service_role' - 'token' - 'authorization';

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, old_data, new_data, metadata
  )
  VALUES (
    auth.uid(),
    trim(p_action),
    trim(p_entity),
    p_entity_id,
    p_before,
    p_after,
    v_meta
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb) TO service_role;