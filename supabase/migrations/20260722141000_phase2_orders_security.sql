-- =============================================================================
-- Fase 2.2 — Segurança de orders / lojas / preços (Lovable Cloud)
-- Pré-requisito: 20260722140000_phase2_audit.sql
-- =============================================================================

-- A) Fechar INSERT público direto — somente create_public_order (DEFINER) insere
DROP POLICY IF EXISTS "Public can create approved store orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create approved store order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create order items" ON public.order_items;

-- B) seller_stores: sempre pending + owner = auth.uid()
DROP POLICY IF EXISTS "Sacoleiras can create their own store" ON public.seller_stores;
DROP POLICY IF EXISTS "Users can create their own store" ON public.seller_stores;
DROP POLICY IF EXISTS "Authenticated can insert seller stores" ON public.seller_stores;

CREATE POLICY "Sacoleiras can create own store as pending"
ON public.seller_stores
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid()
  AND status = 'pending'::public.seller_store_status
);

CREATE OR REPLACE FUNCTION public.protect_seller_stores_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.owner_user_id := auth.uid();
    NEW.status := 'pending'::public.seller_store_status;
  ELSIF auth.uid() IS NULL THEN
    NEW.status := COALESCE(NEW.status, 'pending'::public.seller_store_status);
  END IF;

  IF NOT public.is_admin() THEN
    NEW.status := 'pending'::public.seller_store_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_seller_stores_insert ON public.seller_stores;
CREATE TRIGGER trg_protect_seller_stores_insert
BEFORE INSERT ON public.seller_stores
FOR EACH ROW
EXECUTE FUNCTION public.protect_seller_stores_insert();

-- C) Preços internos
REVOKE SELECT (cost_price, wholesale_price) ON public.products FROM anon;
REVOKE SELECT (cost_price) ON public.products FROM authenticated;

CREATE OR REPLACE VIEW public.products_admin_costs
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.cost_price,
  p.wholesale_price
FROM public.products p
WHERE public.is_admin();

GRANT SELECT ON public.products_admin_costs TO authenticated;

COMMENT ON VIEW public.products_admin_costs IS
  'Leitura de cost/wholesale somente quando is_admin(). UI admin deve preferir esta view.';
