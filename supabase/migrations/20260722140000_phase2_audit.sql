-- =============================================================================
-- Fase 2.1 — audit_logs + write_audit_log (Lovable Cloud)
-- Pré-requisito: 20260720* e 20260721* aplicadas no remoto.
-- Sem DROP TABLE de negócio / sem DELETE de dados.
-- NÃO toca checkout, estoque, comissões, carteira, storage nem auth.
--
-- Assinatura consumida por phase2_stock / phase2_finance (posicional):
--   write_audit_log(action, entity, entity_id, before, after, metadata)
--   = (text, text, text, jsonb, jsonb, jsonb) RETURNS uuid
-- =============================================================================

-- ---------------------------------------------------------------------
-- 1) Tabela append-only
-- actor_id nullable → checkout anônimo (auth.uid() IS NULL) não quebra.
-- entity_id nullable → permitido quando a ação não tem alvo único.
-- Retenção: sem purge automático; logs permanecem até política futura.
-- ---------------------------------------------------------------------
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

COMMENT ON TABLE public.audit_logs IS
  'Auditoria append-only. Sem retenção/purge automático nesta migration. Escrita só via write_audit_log (DEFINER).';

COMMENT ON COLUMN public.audit_logs.actor_id IS
  'auth.uid() no momento da escrita; NULL em operações anônimas (ex.: checkout público).';

COMMENT ON COLUMN public.audit_logs.entity_type IS
  'Tipo da entidade (ex.: orders, products). Parâmetro p_entity de write_audit_log.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs (action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2) Policies de leitura
-- Admin: SELECT total.
-- Sacoleira: NÃO prevista nesta migration (sem store_id na linha).
-- anon: sem acesso.
-- Escrita direta: nenhuma policy INSERT/UPDATE/DELETE → bloqueada via RLS
--   + revokes (escrita só pelo owner via write_audit_log DEFINER).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can select audit logs" ON public.audit_logs;
CREATE POLICY "Admins can select audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------
-- 3) write_audit_log
-- Chamável por funções SECURITY DEFINER do mesmo owner (create_public_order,
-- restore_stock_*, mark_order_paid) e por service_role.
-- NÃO executável por anon/authenticated (impede spam/forja de logs).
-- ---------------------------------------------------------------------
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
  v_action text := trim(COALESCE(p_action, ''));
  v_entity text := trim(COALESCE(p_entity, ''));
  v_meta jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  IF length(v_action) = 0 THEN
    RAISE EXCEPTION 'audit action é obrigatória';
  END IF;

  IF length(v_entity) = 0 THEN
    RAISE EXCEPTION 'audit entity_type é obrigatório';
  END IF;

  -- Reduz risco de vazar segredos em metadata
  v_meta := v_meta
    - 'password'
    - 'access_token'
    - 'refresh_token'
    - 'service_role'
    - 'token'
    - 'authorization'
    - 'api_key'
    - 'secret';

  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  ) VALUES (
    auth.uid(),          -- NULL em checkout anônimo — OK
    v_action,
    v_entity,
    p_entity_id,         -- NULL permitido
    p_before,
    p_after,
    v_meta
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb) IS
  'Escreve audit_logs como DEFINER. Params: action, entity_type, entity_id, old_data, new_data, metadata. actor_id = auth.uid() (nullable).';

REVOKE ALL ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, jsonb)
  TO service_role;

-- ---------------------------------------------------------------------
-- 4) Grants de tabela
-- ---------------------------------------------------------------------
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.audit_logs FROM authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;  -- RLS: só is_admin()
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;
-- Sem GRANT UPDATE/DELETE para authenticated/anon (append-only).
