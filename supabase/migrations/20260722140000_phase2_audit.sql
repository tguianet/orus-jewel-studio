-- =============================================================================
-- Fase 2.1 — audit_logs (Lovable Cloud)
-- Pré-requisito: 20260720* e 20260721* aplicadas no remoto.
-- Sem DROP TABLE de negócio / sem DELETE de dados.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_nonempty CHECK (length(trim(action)) > 0),
  CONSTRAINT audit_logs_entity_nonempty CHECK (length(trim(entity)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select audit logs" ON public.audit_logs;
CREATE POLICY "Admins can select audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

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

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, before_data, after_data, metadata)
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

REVOKE ALL ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb) TO service_role;

REVOKE ALL ON TABLE public.audit_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM authenticated;
