-- =============================================================================
-- Fase 2.4 — Comissões e carteira somente em paid (Lovable Cloud)
-- Pré-requisito: phase2_audit (+ stock/orders_security já aplicados)
-- NÃO apaga comissões históricas.
-- NÃO altera create_public_order, estoque, storage nem auth.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Remover criação de comissão no INSERT do pedido
-- (legado: orders_create_mlm_commissions + trg_orders_created_commissions)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_orders_created_commissions ON public.orders;
DROP TRIGGER IF EXISTS orders_create_mlm_commissions ON public.orders;

-- Função do trigger de INSERT vira no-op (defesa se alguém recriar o trigger)
CREATE OR REPLACE FUNCTION public.handle_order_created_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Desativado: comissões nascem/liberam somente em paid (mark_order_paid).
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Índices únicos (anti-duplicidade sob concorrência)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS commissions_order_reseller_level_uidx
  ON public.commissions (order_id, reseller_id, level);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_commission_type_uidx
  ON public.wallet_transactions (commission_id)
  WHERE commission_id IS NOT NULL
    AND type = 'commission';

-- ---------------------------------------------------------------------------
-- 3) create_mlm_commissions_for_order — só para pedido paid; rates do CHECK do banco
-- ---------------------------------------------------------------------------
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
  -- Percentuais alinhados ao CHECK commissions_rate_check (fonte no banco)
  commission_rates numeric[] := ARRAY[0.10, 0.05, 0.02];
  current_level integer := 1;
  commission_amount numeric;
  created_commission_id uuid;
  v_created_count integer := 0;
  v_wallet_count integer := 0;
BEGIN
  SELECT * INTO order_record
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

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
  FROM public.seller_stores
  WHERE id = order_record.seller_store_id;

  IF source_reseller IS NULL THEN
    PERFORM public.write_audit_log(
      'create_mlm_commissions_skipped_no_reseller',
      'orders',
      _order_id::text,
      NULL,
      jsonb_build_object('seller_store_id', order_record.seller_store_id),
      jsonb_build_object('source', 'create_mlm_commissions_for_order')
    );
    RETURN;
  END IF;

  current_reseller := source_reseller;

  WHILE current_reseller IS NOT NULL AND current_level <= 3 LOOP
    commission_amount := round(
      (COALESCE(order_record.total, 0) * commission_rates[current_level])::numeric,
      2
    );

    INSERT INTO public.commissions (
      order_id,
      reseller_id,
      source_reseller_id,
      level,
      rate,
      amount,
      status
    ) VALUES (
      _order_id,
      current_reseller,
      source_reseller,
      current_level,
      commission_rates[current_level],
      commission_amount,
      'available'
    )
    ON CONFLICT (order_id, reseller_id, level) DO NOTHING
    RETURNING id INTO created_commission_id;

    IF created_commission_id IS NULL THEN
      SELECT c.id INTO created_commission_id
      FROM public.commissions c
      WHERE c.order_id = _order_id
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
      WHERE id = created_commission_id
        AND status = 'pending';

      BEGIN
        INSERT INTO public.wallet_transactions (
          reseller_id,
          commission_id,
          type,
          amount,
          status,
          description
        )
        SELECT
          current_reseller,
          created_commission_id,
          'commission',
          commission_amount,
          'available',
          CASE
            WHEN current_reseller = source_reseller
              THEN 'Ganho por venda — pedido ' || _order_id::text
            ELSE 'Comissão MLM nível ' || current_level::text || ' — pedido ' || _order_id::text
          END
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.wallet_transactions wt
          WHERE wt.commission_id = created_commission_id
            AND wt.type = 'commission'
        );

        IF FOUND THEN
          v_wallet_count := v_wallet_count + 1;
        END IF;
      EXCEPTION
        WHEN unique_violation THEN
          NULL; -- corrida: outra sessão já criou a wallet desta comissão
      END;

      UPDATE public.wallet_transactions
      SET status = 'available', updated_at = now()
      WHERE commission_id = created_commission_id
        AND type = 'commission'
        AND status = 'pending';
    END IF;

    created_commission_id := NULL;

    SELECT parent_id INTO parent_reseller
    FROM public.resellers
    WHERE id = current_reseller;

    current_reseller := parent_reseller;
    current_level := current_level + 1;
  END LOOP;

  PERFORM public.write_audit_log(
    'create_mlm_commissions_for_order',
    'orders',
    _order_id::text,
    NULL,
    jsonb_build_object(
      'commissions_created', v_created_count,
      'wallets_created', v_wallet_count,
      'total', order_record.total
    ),
    jsonb_build_object('source', 'create_mlm_commissions_for_order')
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Liberar pending→available quando status vira paid
-- (cobre comissões históricas criadas no INSERT antigo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_wallet_for_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comm_count integer := 0;
  v_wallet_count integer := 0;
BEGIN
  IF NEW.status = 'paid'::public.order_status
     AND OLD.status IS DISTINCT FROM NEW.status THEN

    UPDATE public.commissions
    SET status = 'available', updated_at = now()
    WHERE order_id = NEW.id
      AND status = 'pending';
    GET DIAGNOSTICS v_comm_count = ROW_COUNT;

    UPDATE public.wallet_transactions wt
    SET status = 'available', updated_at = now()
    FROM public.commissions c
    WHERE wt.commission_id = c.id
      AND c.order_id = NEW.id
      AND wt.status = 'pending';
    GET DIAGNOSTICS v_wallet_count = ROW_COUNT;

    IF v_comm_count > 0 OR v_wallet_count > 0 THEN
      PERFORM public.write_audit_log(
        'release_wallet_for_paid_order',
        'orders',
        NEW.id::text,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        jsonb_build_object(
          'commissions_released', v_comm_count,
          'wallets_released', v_wallet_count,
          'source', 'release_wallet_for_paid_order'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_release_wallet ON public.orders;
DROP TRIGGER IF EXISTS orders_release_wallet_on_paid ON public.orders;
CREATE TRIGGER trg_orders_release_wallet
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.release_wallet_for_paid_order();

-- ---------------------------------------------------------------------------
-- 5) Bloquear saída de paid sem flag explícita de estorno
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_orders_paid_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'paid'::public.order_status
     AND NEW.status IS DISTINCT FROM 'paid'::public.order_status THEN
    IF COALESCE(current_setting('app.allow_paid_reversal', true), 'off') IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'Pedido pago não pode mudar de status sem fluxo de estorno (app.allow_paid_reversal=on)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_orders_paid_status ON public.orders;
CREATE TRIGGER trg_protect_orders_paid_status
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_orders_paid_status();

-- ---------------------------------------------------------------------------
-- 6) mark_order_paid — admin ou service_role; lock; idempotente
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_had_commissions boolean;
  v_is_service boolean;
BEGIN
  v_is_service := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';

  IF NOT v_is_service THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem marcar pedidos como pagos';
    END IF;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status = 'cancelled'::public.order_status THEN
    RAISE EXCEPTION 'Pedido cancelado não pode ser marcado como pago';
  END IF;

  -- Já paid: não muda status de novo; garante comissões/carteira (idempotente)
  IF v_order.status = 'paid'::public.order_status THEN
    SELECT EXISTS (
      SELECT 1 FROM public.commissions c WHERE c.order_id = _order_id
    ) INTO v_had_commissions;

    PERFORM public.create_mlm_commissions_for_order(_order_id);

    UPDATE public.commissions
    SET status = 'available', updated_at = now()
    WHERE order_id = _order_id AND status = 'pending';

    UPDATE public.wallet_transactions wt
    SET status = 'available', updated_at = now()
    FROM public.commissions c
    WHERE wt.commission_id = c.id
      AND c.order_id = _order_id
      AND wt.status = 'pending';

    PERFORM public.write_audit_log(
      'mark_order_paid_idempotent_noop',
      'orders',
      _order_id::text,
      jsonb_build_object('status', v_order.status, 'had_commissions', v_had_commissions),
      jsonb_build_object('status', 'paid'),
      jsonb_build_object('note', 'já estava paid; comissões/carteira reconciliadas')
    );
    RETURN;
  END IF;

  UPDATE public.orders
  SET status = 'paid'::public.order_status, updated_at = now()
  WHERE id = _order_id;

  -- Trigger release_wallet libera pending históricos; create_mlm cria ausentes
  SELECT EXISTS (
    SELECT 1 FROM public.commissions c WHERE c.order_id = _order_id
  ) INTO v_had_commissions;

  PERFORM public.create_mlm_commissions_for_order(_order_id);

  UPDATE public.commissions
  SET status = 'available', updated_at = now()
  WHERE order_id = _order_id AND status = 'pending';

  UPDATE public.wallet_transactions wt
  SET status = 'available', updated_at = now()
  FROM public.commissions c
  WHERE wt.commission_id = c.id
    AND c.order_id = _order_id
    AND wt.status = 'pending';

  PERFORM public.write_audit_log(
    'mark_order_paid',
    'orders',
    _order_id::text,
    jsonb_build_object(
      'status', v_order.status,
      'total', v_order.total,
      'had_commissions', v_had_commissions
    ),
    jsonb_build_object('status', 'paid'),
    jsonb_build_object('source', 'mark_order_paid')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_paid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.create_mlm_commissions_for_order(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_mlm_commissions_for_order(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.handle_order_created_commissions()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_wallet_for_paid_order()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_orders_paid_status()
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) RLS/grants — leitura ok; escrita direta bloqueada para authenticated
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can select commissions" ON public.commissions;
DROP POLICY IF EXISTS "Resellers can view own commissions" ON public.commissions;

CREATE POLICY "Admins can select commissions"
ON public.commissions
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Resellers can view own commissions"
ON public.commissions
FOR SELECT
TO authenticated
USING (public.owns_reseller(reseller_id));

DROP POLICY IF EXISTS "Admins can manage wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can select wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Resellers can view own wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Admins can select wallet transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Resellers can view own wallet transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (public.owns_reseller(reseller_id));

REVOKE ALL ON TABLE public.commissions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.wallet_transactions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.commissions FROM authenticated;
REVOKE ALL ON TABLE public.wallet_transactions FROM authenticated;
GRANT SELECT ON TABLE public.commissions TO authenticated;
GRANT SELECT ON TABLE public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.commissions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.wallet_transactions TO service_role;
-- Sem DELETE para authenticated; service_role sem DELETE (append-only operacional).

COMMENT ON FUNCTION public.mark_order_paid(uuid) IS
  'Marca pedido paid (admin/service_role). Cria/libera comissões e wallet uma vez. Idempotente com FOR UPDATE.';

COMMENT ON FUNCTION public.create_mlm_commissions_for_order(uuid) IS
  'Cria comissões MLM + wallet somente se order.status=paid. Rates 10/5/2% (CHECK do banco). ON CONFLICT evita duplicata.';
