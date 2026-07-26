-- =============================================================================
-- Restringe SELECT de cost_price (sacoleira/anon) — admin via admin_product_costs()
-- Não altera checkout, comissões, carteira, estoque ou devoluções.
-- =============================================================================

-- 1) Revogar cost_price de authenticated e anon
REVOKE SELECT (cost_price) ON public.products FROM authenticated, anon;

-- 2) Reafirmar: anon sem cost_price nem wholesale_price
REVOKE SELECT (cost_price, wholesale_price) ON public.products FROM anon;

-- 3) wholesale_price permanece acessível a authenticated via GRANT SELECT da tabela
--    (apenas cost_price foi revogado na coluna). Não conceder cost_price novamente.

-- 4) RPC admin para custos (preservar / endurecer)
CREATE OR REPLACE FUNCTION public.admin_product_costs()
RETURNS TABLE (
  id uuid,
  cost_price numeric,
  wholesale_price numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem acessar custos de produtos';
  END IF;

  RETURN QUERY
  SELECT p.id, p.cost_price, p.wholesale_price
  FROM public.products p;
END;
$$;

COMMENT ON FUNCTION public.admin_product_costs() IS
  'Custos internos (cost_price/wholesale) somente para is_admin(). Sacoleira e anon negados.';

REVOKE ALL ON FUNCTION public.admin_product_costs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_product_costs() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_product_costs() TO authenticated, service_role;

-- 5) Não criar view pública com cost_price
DROP VIEW IF EXISTS public.products_admin_costs;
