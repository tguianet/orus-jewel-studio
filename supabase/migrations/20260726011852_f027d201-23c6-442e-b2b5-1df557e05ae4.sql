-- =============================================================================
-- Configuração de comissões MLM (admin-only)
-- - Tabela singleton commission_settings
-- - SELECT somente admin; escrita somente via update_commission_settings
-- - get_current_commission_rates: taxas públicas para authenticated
-- - create_mlm_commissions_for_order lê taxas vigentes
-- - Pedidos/comissões já existentes NÃO são recalculados
-- - Migration idempotente (policies/constraints)
-- =============================================================================

-- 1) Tabela de configuração
CREATE TABLE IF NOT EXISTS public.commission_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-4000-8000-000000000001'::uuid,
  level_1_rate numeric NOT NULL,
  level_2_rate numeric NOT NULL,
  level_3_rate numeric NOT NULL,
  active_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT commission_settings_singleton CHECK (
    id = '00000000-0000-4000-8000-000000000001'::uuid
  ),
  CONSTRAINT commission_settings_level_1_rate_check CHECK (
    level_1_rate >= 0 AND level_1_rate <= 1
  ),
  CONSTRAINT commission_settings_level_2_rate_check CHECK (
    level_2_rate >= 0 AND level_2_rate <= 1
  ),
  CONSTRAINT commission_settings_level_3_rate_check CHECK (
    level_3_rate >= 0 AND level_3_rate <= 1
  ),
  CONSTRAINT commission_settings_sum_check CHECK (
    (level_1_rate + level_2_rate + level_3_rate) <= 1
  )
);

COMMENT ON TABLE public.commission_settings IS
  'Taxas MLM vigentes (frações 0–1). Singleton. Alterações valem só para vendas futuras. Escrita somente via RPC.';

-- Seed oficial
INSERT INTO public.commission_settings (
  id, level_1_rate, level_2_rate, level_3_rate, active_from, created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  0.25,
  0.03,
  0.02,
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 2) Liberar CHECK antigo de commissions (0.10/0.05/0.02) para aceitar taxas configuráveis
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_rate_check;
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_rate_range_check;
ALTER TABLE public.commissions
  ADD CONSTRAINT commissions_rate_range_check
  CHECK (rate >= 0 AND rate <= 1);

-- 3) RLS — SELECT somente admin; sem escrita direta
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.commission_settings FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Admins can select commission settings" ON public.commission_settings;
DROP POLICY IF EXISTS "Admins can insert commission settings" ON public.commission_settings;
DROP POLICY IF EXISTS "Admins can update commission settings" ON public.commission_settings;
DROP POLICY IF EXISTS "Admins can delete commission settings" ON public.commission_settings;

CREATE POLICY "Admins can select commission settings"
ON public.commission_settings
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Sem policies de INSERT/UPDATE/DELETE: escrita apenas via update_commission_settings (DEFINER)
GRANT SELECT ON TABLE public.commission_settings TO authenticated;
GRANT ALL ON TABLE public.commission_settings TO service_role;

-- 4) RPC admin para atualizar + auditar (write_audit_log só via DEFINER)
CREATE OR REPLACE FUNCTION public.update_commission_settings(
  p_level_1_rate numeric,
  p_level_2_rate numeric,
  p_level_3_rate numeric
)
RETURNS public.commission_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.commission_settings%ROWTYPE;
  v_after public.commission_settings%ROWTYPE;
  v_sum numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar comissões';
  END IF;

  IF p_level_1_rate IS NULL OR p_level_2_rate IS NULL OR p_level_3_rate IS NULL THEN
    RAISE EXCEPTION 'Taxas de comissão são obrigatórias';
  END IF;

  IF p_level_1_rate < 0 OR p_level_1_rate > 1
     OR p_level_2_rate < 0 OR p_level_2_rate > 1
     OR p_level_3_rate < 0 OR p_level_3_rate > 1 THEN
    RAISE EXCEPTION 'Cada taxa deve estar entre 0 e 100%%';
  END IF;

  v_sum := p_level_1_rate + p_level_2_rate + p_level_3_rate;
  IF v_sum > 1 THEN
    RAISE EXCEPTION 'A soma das comissões não pode ultrapassar 100%%';
  END IF;

  SELECT * INTO v_before
  FROM public.commission_settings
  WHERE id = '00000000-0000-4000-8000-000000000001'::uuid
  FOR UPDATE;

  IF v_before.id IS NULL THEN
    INSERT INTO public.commission_settings (
      id, level_1_rate, level_2_rate, level_3_rate, active_from, updated_by
    ) VALUES (
      '00000000-0000-4000-8000-000000000001'::uuid,
      p_level_1_rate, p_level_2_rate, p_level_3_rate, now(), auth.uid()
    )
    RETURNING * INTO v_after;
  ELSE
    UPDATE public.commission_settings
    SET
      level_1_rate = p_level_1_rate,
      level_2_rate = p_level_2_rate,
      level_3_rate = p_level_3_rate,
      active_from = now(),
      updated_at = now(),
      updated_by = auth.uid()
    WHERE id = '00000000-0000-4000-8000-000000000001'::uuid
    RETURNING * INTO v_after;
  END IF;

  PERFORM public.write_audit_log(
    'update_commission_settings',
    'commission_settings',
    v_after.id::text,
    jsonb_build_object(
      'level_1_rate', v_before.level_1_rate,
      'level_2_rate', v_before.level_2_rate,
      'level_3_rate', v_before.level_3_rate,
      'active_from', v_before.active_from,
      'updated_by', v_before.updated_by
    ),
    jsonb_build_object(
      'level_1_rate', v_after.level_1_rate,
      'level_2_rate', v_after.level_2_rate,
      'level_3_rate', v_after.level_3_rate,
      'active_from', v_after.active_from,
      'updated_by', v_after.updated_by
    ),
    jsonb_build_object(
      'source', 'update_commission_settings',
      'actor_id', auth.uid(),
      'applies_to', 'future_sales_only'
    )
  );

  RETURN v_after;
END;
$$;

COMMENT ON FUNCTION public.update_commission_settings(numeric, numeric, numeric) IS
  'Atualiza taxas MLM (admin). Audita before/after. Não recalcula commissions existentes.';

REVOKE ALL ON FUNCTION public.update_commission_settings(numeric, numeric, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_commission_settings(numeric, numeric, numeric)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_commission_settings(numeric, numeric, numeric)
  TO service_role;

-- 5) RPC somente leitura: taxas atuais para usuários autenticados (sem metadados sensíveis)
CREATE OR REPLACE FUNCTION public.get_current_commission_rates()
RETURNS TABLE (
  level_1_rate numeric,
  level_2_rate numeric,
  level_3_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  settings_row public.commission_settings%ROWTYPE;
BEGIN
  SELECT * INTO settings_row
  FROM public.commission_settings
  WHERE id = '00000000-0000-4000-8000-000000000001'::uuid;

  IF settings_row.id IS NULL THEN
    level_1_rate := 0.25;
    level_2_rate := 0.03;
    level_3_rate := 0.02;
  ELSE
    level_1_rate := settings_row.level_1_rate;
    level_2_rate := settings_row.level_2_rate;
    level_3_rate := settings_row.level_3_rate;
  END IF;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.get_current_commission_rates() IS
  'Retorna apenas as 3 taxas MLM vigentes. Sem updated_by/datas. Fallback oficial se seed ausente.';

REVOKE ALL ON FUNCTION public.get_current_commission_rates()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_commission_rates()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_commission_rates()
  TO service_role;

-- 6) Geração de comissão usa taxas vigentes; nunca altera rate/amount já gravados
CREATE OR REPLACE FUNCTION public.create_mlm_commissions_for_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record public.orders%ROWTYPE;
  source_reseller uuid;
  current_reseller uuid;
  parent_reseller uuid;
  commission_rates numeric[];
  settings_row public.commission_settings%ROWTYPE;
  current_level integer := 1;
  commission_amount numeric;
  created_commission_id uuid;
  v_created_count integer := 0;
  v_wallet_count integer := 0;
BEGIN
  SELECT * INTO order_record FROM public.orders WHERE id = _order_id FOR UPDATE;

  IF order_record.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF order_record.status = 'cancelled'::public.order_status THEN
    RAISE EXCEPTION 'Pedido cancelado não gera comissão';
  END IF;

  IF order_record.status IS DISTINCT FROM 'paid'::public.order_status THEN
    RAISE EXCEPTION 'Comissões só podem ser criadas para pedidos paid';
  END IF;

  SELECT * INTO settings_row
  FROM public.commission_settings
  WHERE id = '00000000-0000-4000-8000-000000000001'::uuid;

  IF settings_row.id IS NULL THEN
    -- Fallback técnico (mesmos defaults oficiais) se seed ausente
    commission_rates := ARRAY[0.25, 0.03, 0.02];
  ELSE
    commission_rates := ARRAY[
      settings_row.level_1_rate,
      settings_row.level_2_rate,
      settings_row.level_3_rate
    ];
  END IF;

  SELECT reseller_id INTO source_reseller
  FROM public.seller_stores WHERE id = order_record.seller_store_id;

  IF source_reseller IS NULL THEN
    PERFORM public.write_audit_log(
      'create_mlm_commissions_skipped_no_reseller','orders',_order_id::text,NULL,
      jsonb_build_object('seller_store_id', order_record.seller_store_id),
      jsonb_build_object('source','create_mlm_commissions_for_order'));
    RETURN;
  END IF;

  current_reseller := source_reseller;

  WHILE current_reseller IS NOT NULL AND current_level <= 3 LOOP
    commission_amount := round((COALESCE(order_record.total,0) * commission_rates[current_level])::numeric, 2);

    -- ON CONFLICT DO NOTHING: pedidos já comissionados mantêm rate/amount originais
    INSERT INTO public.commissions (order_id, reseller_id, source_reseller_id, level, rate, amount, status)
    VALUES (_order_id, current_reseller, source_reseller, current_level, commission_rates[current_level], commission_amount, 'available')
    ON CONFLICT (order_id, reseller_id, level) DO NOTHING
    RETURNING id INTO created_commission_id;

    IF created_commission_id IS NULL THEN
      SELECT c.id INTO created_commission_id
      FROM public.commissions c
      WHERE c.order_id = _order_id AND c.reseller_id = current_reseller AND c.level = current_level;
    ELSE
      v_created_count := v_created_count + 1;
    END IF;

    IF created_commission_id IS NOT NULL THEN
      -- Só ajusta status; NUNCA sobrescreve rate/amount de linhas existentes
      UPDATE public.commissions
      SET status = CASE WHEN status='cancelled' THEN status WHEN status='paid' THEN status ELSE 'available' END,
          updated_at = now()
      WHERE id = created_commission_id AND status = 'pending';

      BEGIN
        INSERT INTO public.wallet_transactions (reseller_id, commission_id, type, amount, status, description)
        SELECT current_reseller, created_commission_id, 'commission',
          (SELECT amount FROM public.commissions WHERE id = created_commission_id),
          'available',
          CASE WHEN current_reseller = source_reseller
            THEN 'Ganho por venda — pedido ' || _order_id::text
            ELSE 'Comissão MLM nível ' || current_level::text || ' — pedido ' || _order_id::text
          END
        WHERE NOT EXISTS (
          SELECT 1 FROM public.wallet_transactions wt
          WHERE wt.commission_id = created_commission_id AND wt.type = 'commission');
        IF FOUND THEN v_wallet_count := v_wallet_count + 1; END IF;
      EXCEPTION WHEN unique_violation THEN NULL;
      END;

      UPDATE public.wallet_transactions
      SET status = 'available', updated_at = now()
      WHERE commission_id = created_commission_id AND type = 'commission' AND status = 'pending';
    END IF;

    created_commission_id := NULL;

    SELECT parent_id INTO parent_reseller FROM public.resellers WHERE id = current_reseller;
    current_reseller := parent_reseller;
    current_level := current_level + 1;
  END LOOP;

  PERFORM public.write_audit_log(
    'create_mlm_commissions_for_order','orders',_order_id::text,NULL,
    jsonb_build_object(
      'commissions_created', v_created_count,
      'wallets_created', v_wallet_count,
      'total', order_record.total,
      'rates_used', commission_rates
    ),
    jsonb_build_object('source','create_mlm_commissions_for_order'));
END;
$$;

COMMENT ON FUNCTION public.create_mlm_commissions_for_order(uuid) IS
  'Gera commissions com taxas de commission_settings no momento do paid. Idempotente: não recalcula linhas existentes.';