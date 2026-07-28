-- 1) enum + products.jewelry_material
DO $mig$ BEGIN
  CREATE TYPE public.jewelry_material AS ENUM ('gold', 'silver', 'plated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $mig$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS jewelry_material public.jewelry_material;

COMMENT ON COLUMN public.products.jewelry_material IS
  'Tipo comercial da joia para MLM: gold|silver|plated. NULL = pendente de classificação; não pode vender.';

CREATE INDEX IF NOT EXISTS products_jewelry_material_idx
  ON public.products (jewelry_material)
  WHERE jewelry_material IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_pending_jewelry_material_idx
  ON public.products (id)
  WHERE jewelry_material IS NULL AND seller_store_id IS NULL;

CREATE OR REPLACE FUNCTION public.trg_products_require_jewelry_material_when_active()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status = 'active'::public.product_status AND NEW.jewelry_material IS NULL THEN
    RAISE EXCEPTION 'Defina o tipo da joia antes de disponibilizar este produto para venda.';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS products_require_jewelry_material_when_active ON public.products;
CREATE TRIGGER products_require_jewelry_material_when_active
  BEFORE INSERT OR UPDATE OF status, jewelry_material
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_products_require_jewelry_material_when_active();

-- 2) order_items snapshot
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS jewelry_material public.jewelry_material;

COMMENT ON COLUMN public.order_items.jewelry_material IS
  'Snapshot do tipo da joia no momento da venda (imutável para comissão).';

CREATE OR REPLACE FUNCTION public.trg_order_items_snapshot_jewelry_material()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_mat public.jewelry_material;
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'Item de pedido sem product_id';
  END IF;

  SELECT p.jewelry_material INTO v_mat
  FROM public.products p
  WHERE p.id = NEW.product_id;

  IF v_mat IS NULL THEN
    RAISE EXCEPTION
      'Produto sem tipo de joia definido. Classifique como Ouro, Prata ou Folheado antes de vender.';
  END IF;

  NEW.jewelry_material := COALESCE(NEW.jewelry_material, v_mat);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS order_items_snapshot_jewelry_material ON public.order_items;
CREATE TRIGGER order_items_snapshot_jewelry_material
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_items_snapshot_jewelry_material();

-- 3) matriz de taxas
CREATE TABLE IF NOT EXISTS public.mlm_commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jewelry_material public.jewelry_material NOT NULL,
  level smallint NOT NULL,
  percentage numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT mlm_commission_rates_level_check CHECK (level IN (1, 2, 3)),
  CONSTRAINT mlm_commission_rates_percentage_check CHECK (percentage >= 0 AND percentage <= 1),
  CONSTRAINT mlm_commission_rates_material_level_uidx UNIQUE (jewelry_material, level)
);

COMMENT ON TABLE public.mlm_commission_rates IS
  'Taxas MLM por tipo de joia e nível (fração 0–1). Alterações só para vendas futuras.';

ALTER TABLE public.mlm_commission_rates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mlm_commission_rates FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Admins can select mlm commission rates" ON public.mlm_commission_rates;
CREATE POLICY "Admins can select mlm commission rates"
ON public.mlm_commission_rates
FOR SELECT
TO authenticated
USING (public.is_admin());

GRANT SELECT ON TABLE public.mlm_commission_rates TO authenticated;
GRANT ALL ON TABLE public.mlm_commission_rates TO service_role;

INSERT INTO public.mlm_commission_rates (jewelry_material, level, percentage)
SELECT m.mat, lv.level, COALESCE(
  CASE lv.level
    WHEN 1 THEN cs.level_1_rate
    WHEN 2 THEN cs.level_2_rate
    WHEN 3 THEN cs.level_3_rate
  END,
  CASE lv.level WHEN 1 THEN 0.25 WHEN 2 THEN 0.03 ELSE 0.02 END
)
FROM (VALUES
  ('gold'::public.jewelry_material),
  ('silver'::public.jewelry_material),
  ('plated'::public.jewelry_material)
) AS m(mat)
CROSS JOIN (VALUES (1), (2), (3)) AS lv(level)
LEFT JOIN public.commission_settings cs
  ON cs.id = '00000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (jewelry_material, level) DO NOTHING;

-- 4) commissions snapshot columns
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS jewelry_material public.jewelry_material,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_amount numeric,
  ADD COLUMN IF NOT EXISTS percentage_applied numeric;

COMMENT ON COLUMN public.commissions.jewelry_material IS 'Snapshot do tipo da joia na geração.';
COMMENT ON COLUMN public.commissions.base_amount IS 'Base = order_items.total na geração.';
COMMENT ON COLUMN public.commissions.percentage_applied IS 'Taxa aplicada (fração 0–1), espelho de rate.';

UPDATE public.commissions
SET percentage_applied = rate
WHERE percentage_applied IS NULL AND rate IS NOT NULL;

ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_percentage_applied_check;
ALTER TABLE public.commissions
  ADD CONSTRAINT commissions_percentage_applied_check
  CHECK (percentage_applied IS NULL OR (percentage_applied >= 0 AND percentage_applied <= 1));

ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_base_amount_check;
ALTER TABLE public.commissions
  ADD CONSTRAINT commissions_base_amount_check
  CHECK (base_amount IS NULL OR base_amount >= 0);

DROP INDEX IF EXISTS public.commissions_order_reseller_level_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS commissions_legacy_order_reseller_level_uidx
  ON public.commissions (order_id, reseller_id, level)
  WHERE order_item_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commissions_item_reseller_level_uidx
  ON public.commissions (order_item_id, reseller_id, level)
  WHERE order_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS commissions_jewelry_material_idx
  ON public.commissions (jewelry_material)
  WHERE jewelry_material IS NOT NULL;

CREATE INDEX IF NOT EXISTS commissions_product_id_idx
  ON public.commissions (product_id)
  WHERE product_id IS NOT NULL;

-- 5) RPCs da matriz
CREATE OR REPLACE FUNCTION public.get_mlm_commission_rates()
RETURNS TABLE (
  jewelry_material public.jewelry_material,
  level smallint,
  percentage numeric,
  updated_at timestamptz,
  updated_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
  SELECT r.jewelry_material, r.level, r.percentage, r.updated_at,
         CASE WHEN public.is_admin() THEN r.updated_by ELSE NULL END
  FROM public.mlm_commission_rates r
  ORDER BY r.jewelry_material, r.level;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_mlm_commission_rates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mlm_commission_rates() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_mlm_commission_rates(p_rates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
  v_mat text;
  v_level int;
  v_pct numeric;
  v_sum_gold numeric;
  v_sum_silver numeric;
  v_sum_plated numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar comissões';
  END IF;

  IF p_rates IS NULL OR jsonb_typeof(p_rates) <> 'array' OR jsonb_array_length(p_rates) <> 9 THEN
    RAISE EXCEPTION 'Informe as 9 taxas (3 materiais × 3 níveis)';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'jewelry_material', jewelry_material,
    'level', level,
    'percentage', percentage
  ) ORDER BY jewelry_material, level), '[]'::jsonb)
  INTO v_before
  FROM public.mlm_commission_rates;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rates)
  LOOP
    v_mat := v_row->>'jewelry_material';
    v_level := (v_row->>'level')::int;
    v_pct := (v_row->>'percentage')::numeric;

    IF v_mat IS NULL OR v_mat NOT IN ('gold', 'silver', 'plated') THEN
      RAISE EXCEPTION 'jewelry_material inválido';
    END IF;
    IF v_level IS NULL OR v_level NOT IN (1, 2, 3) THEN
      RAISE EXCEPTION 'level inválido';
    END IF;
    IF v_pct IS NULL OR v_pct < 0 OR v_pct > 1 THEN
      RAISE EXCEPTION 'Cada taxa deve estar entre 0 e 100%%';
    END IF;

    UPDATE public.mlm_commission_rates
    SET percentage = v_pct,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE jewelry_material = v_mat::public.jewelry_material
      AND level = v_level;

    IF NOT FOUND THEN
      INSERT INTO public.mlm_commission_rates (jewelry_material, level, percentage, updated_by)
      VALUES (v_mat::public.jewelry_material, v_level, v_pct, auth.uid());
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(percentage), 0) INTO v_sum_gold
  FROM public.mlm_commission_rates WHERE jewelry_material = 'gold';
  SELECT COALESCE(SUM(percentage), 0) INTO v_sum_silver
  FROM public.mlm_commission_rates WHERE jewelry_material = 'silver';
  SELECT COALESCE(SUM(percentage), 0) INTO v_sum_plated
  FROM public.mlm_commission_rates WHERE jewelry_material = 'plated';

  IF v_sum_gold > 1 OR v_sum_silver > 1 OR v_sum_plated > 1 THEN
    RAISE EXCEPTION 'A soma dos níveis por tipo de joia não pode ultrapassar 100%%';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'jewelry_material', jewelry_material,
    'level', level,
    'percentage', percentage
  ) ORDER BY jewelry_material, level), '[]'::jsonb)
  INTO v_after
  FROM public.mlm_commission_rates;

  UPDATE public.commission_settings
  SET
    level_1_rate = (SELECT percentage FROM public.mlm_commission_rates WHERE jewelry_material = 'gold' AND level = 1),
    level_2_rate = (SELECT percentage FROM public.mlm_commission_rates WHERE jewelry_material = 'gold' AND level = 2),
    level_3_rate = (SELECT percentage FROM public.mlm_commission_rates WHERE jewelry_material = 'gold' AND level = 3),
    active_from = now(),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = '00000000-0000-4000-8000-000000000001'::uuid;

  PERFORM public.write_audit_log(
    'update_mlm_commission_rates',
    'mlm_commission_rates',
    'matrix',
    v_before,
    v_after,
    jsonb_build_object(
      'source', 'update_mlm_commission_rates',
      'actor_id', auth.uid(),
      'applies_to', 'future_sales_only'
    )
  );

  RETURN v_after;
END;
$fn$;

REVOKE ALL ON FUNCTION public.update_mlm_commission_rates(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_mlm_commission_rates(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.update_mlm_commission_rates(jsonb) IS
  'Atualiza matriz MLM 3×3 (admin). Não recalcula commissions existentes.';

-- 6) geração de comissões por item
CREATE OR REPLACE FUNCTION public.create_mlm_commissions_for_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  order_record public.orders%ROWTYPE;
  source_reseller uuid;
  current_reseller uuid;
  parent_reseller uuid;
  item_rec record;
  v_rate numeric;
  v_base numeric;
  v_amount numeric;
  v_mat public.jewelry_material;
  current_level integer;
  created_commission_id uuid;
  v_created_count integer := 0;
  v_wallet_count integer := 0;
  v_item_count integer := 0;
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

  SELECT reseller_id INTO source_reseller
  FROM public.seller_stores WHERE id = order_record.seller_store_id;

  IF source_reseller IS NULL THEN
    PERFORM public.write_audit_log(
      'create_mlm_commissions_skipped_no_reseller', 'orders', _order_id::text, NULL,
      jsonb_build_object('seller_store_id', order_record.seller_store_id),
      jsonb_build_object('source', 'create_mlm_commissions_for_order'));
    RETURN;
  END IF;

  SELECT COUNT(*)::integer INTO v_item_count
  FROM public.order_items oi
  WHERE oi.order_id = _order_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens — não é possível gerar comissão';
  END IF;

  FOR item_rec IN
    SELECT
      oi.id AS order_item_id,
      oi.product_id,
      oi.total AS item_total,
      oi.quantity,
      oi.unit_price,
      COALESCE(oi.jewelry_material, p.jewelry_material) AS jewelry_material
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = _order_id
    ORDER BY oi.created_at, oi.id
  LOOP
    v_mat := item_rec.jewelry_material;

    IF v_mat IS NULL THEN
      RAISE EXCEPTION
        'Item % sem tipo de joia. Classifique o produto antes de gerar comissão.',
        item_rec.order_item_id;
    END IF;

    IF item_rec.product_id IS NULL THEN
      RAISE EXCEPTION 'Item % sem product_id', item_rec.order_item_id;
    END IF;

    v_base := round(COALESCE(item_rec.item_total, 0)::numeric, 2);
    IF v_base < 0 THEN
      RAISE EXCEPTION 'Base de comissão inválida no item %', item_rec.order_item_id;
    END IF;

    current_reseller := source_reseller;
    current_level := 1;

    WHILE current_reseller IS NOT NULL AND current_level <= 3 LOOP
      SELECT r.percentage INTO v_rate
      FROM public.mlm_commission_rates r
      WHERE r.jewelry_material = v_mat
        AND r.level = current_level;

      IF v_rate IS NULL THEN
        RAISE EXCEPTION
          'Taxa MLM ausente para material % nível %',
          v_mat, current_level;
      END IF;

      v_amount := round((v_base * v_rate)::numeric, 2);

      INSERT INTO public.commissions (
        order_id,
        order_item_id,
        product_id,
        reseller_id,
        source_reseller_id,
        level,
        rate,
        percentage_applied,
        base_amount,
        amount,
        jewelry_material,
        status
      ) VALUES (
        _order_id,
        item_rec.order_item_id,
        item_rec.product_id,
        current_reseller,
        source_reseller,
        current_level,
        v_rate,
        v_rate,
        v_base,
        v_amount,
        v_mat,
        'available'
      )
      ON CONFLICT (order_item_id, reseller_id, level)
        WHERE (order_item_id IS NOT NULL)
      DO NOTHING
      RETURNING id INTO created_commission_id;

      IF created_commission_id IS NULL THEN
        SELECT c.id INTO created_commission_id
        FROM public.commissions c
        WHERE c.order_item_id = item_rec.order_item_id
          AND c.reseller_id = current_reseller
          AND c.level = current_level;
      ELSE
        v_created_count := v_created_count + 1;
      END IF;

      IF created_commission_id IS NOT NULL THEN
        UPDATE public.commissions
        SET status = CASE
              WHEN status = 'cancelled' THEN status
              WHEN status = 'paid' THEN status
              ELSE 'available'
            END,
            updated_at = now()
        WHERE id = created_commission_id AND status = 'pending';

        BEGIN
          INSERT INTO public.wallet_transactions (
            reseller_id, commission_id, type, amount, status, description
          )
          SELECT
            current_reseller,
            created_commission_id,
            'commission',
            (SELECT amount FROM public.commissions WHERE id = created_commission_id),
            'available',
            CASE
              WHEN current_reseller = source_reseller
                THEN 'Ganho por venda — item ' || item_rec.order_item_id::text
              ELSE 'Comissão MLM nível ' || current_level::text
                   || ' — item ' || item_rec.order_item_id::text
            END
          WHERE NOT EXISTS (
            SELECT 1 FROM public.wallet_transactions wt
            WHERE wt.commission_id = created_commission_id
              AND wt.type = 'commission'
          );
          IF FOUND THEN
            v_wallet_count := v_wallet_count + 1;
          END IF;
        EXCEPTION WHEN unique_violation THEN
          NULL;
        END;

        UPDATE public.wallet_transactions
        SET status = 'available', updated_at = now()
        WHERE commission_id = created_commission_id
          AND type = 'commission'
          AND status = 'pending';
      END IF;

      created_commission_id := NULL;
      SELECT parent_id INTO parent_reseller FROM public.resellers WHERE id = current_reseller;
      current_reseller := parent_reseller;
      current_level := current_level + 1;
    END LOOP;
  END LOOP;

  PERFORM public.write_audit_log(
    'create_mlm_commissions_for_order', 'orders', _order_id::text, NULL,
    jsonb_build_object(
      'commissions_created', v_created_count,
      'wallets_created', v_wallet_count,
      'items', v_item_count,
      'mode', 'per_order_item'
    ),
    jsonb_build_object('source', 'create_mlm_commissions_for_order'));
END;
$fn$;

COMMENT ON FUNCTION public.create_mlm_commissions_for_order(uuid) IS
  'Gera commissions por order_item × nível com taxas de mlm_commission_rates. Base = order_items.total. Idempotente.';

COMMENT ON FUNCTION public.reverse_mlm_commissions_for_order(uuid, text) IS
  'Estorna todas as commissions do pedido (legado por pedido ou por item). Idempotente.';

-- 7) relatório admin com filtro por material (substitui a assinatura antiga)
DROP FUNCTION IF EXISTS public.admin_get_commission_report(timestamptz, timestamptz, int, text, uuid, int, int);

CREATE OR REPLACE FUNCTION public.admin_get_commission_report(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_level int DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_reseller_id uuid DEFAULT NULL,
  p_jewelry_material text DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_size int := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_total bigint;
  v_items jsonb;
  v_summary jsonb;
  v_mat public.jewelry_material;
BEGIN
  PERFORM public._report_require_admin();
  PERFORM public._report_validate_period(p_start_date, p_end_date, 366);
  IF p_status IS NOT NULL AND p_status NOT IN ('pending','available','paid','cancelled','reversed') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;
  IF p_jewelry_material IS NOT NULL THEN
    IF p_jewelry_material NOT IN ('gold', 'silver', 'plated') THEN
      RAISE EXCEPTION 'jewelry_material inválido';
    END IF;
    v_mat := p_jewelry_material::public.jewelry_material;
  END IF;

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
    AND (v_mat IS NULL OR c.jewelry_material = v_mat)
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
    AND (v_mat IS NULL OR c.jewelry_material = v_mat)
    AND (
      p_status IS NULL
      OR (p_status = 'reversed' AND c.status = 'cancelled')
      OR (p_status <> 'reversed' AND c.status = p_status)
    );

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      c.id,
      c.reseller_id,
      c.order_id,
      c.order_item_id,
      c.product_id,
      c.level,
      c.rate,
      c.percentage_applied,
      c.base_amount,
      c.amount,
      c.jewelry_material,
      c.status,
      c.created_at,
      CASE WHEN c.order_item_id IS NULL THEN 'legacy_order' ELSE 'per_item' END AS commission_mode
    FROM public.commissions c
    WHERE c.created_at >= p_start_date AND c.created_at < p_end_date
      AND (p_level IS NULL OR c.level = p_level)
      AND (p_reseller_id IS NULL OR c.reseller_id = p_reseller_id)
      AND (v_mat IS NULL OR c.jewelry_material = v_mat)
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
    'total', v_total
  );
END;
$fn$;

-- 8) contagem de pendentes
CREATE OR REPLACE FUNCTION public.admin_count_products_pending_jewelry_material()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $fn$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  SELECT COUNT(*)::integer INTO v_count
  FROM public.products
  WHERE jewelry_material IS NULL
    AND seller_store_id IS NULL;
  RETURN v_count;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_count_products_pending_jewelry_material() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_count_products_pending_jewelry_material() TO authenticated, service_role;