REVOKE SELECT (cost_price) ON public.products FROM authenticated, anon;

REVOKE SELECT (cost_price, wholesale_price) ON public.products FROM anon;

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

DROP VIEW IF EXISTS public.products_admin_costs;