-- 1. Fix UPDATE policy on categories
DROP POLICY IF EXISTS "Admins and owners can update tenant categories" ON public.categories;
CREATE POLICY "Admins and owners can update tenant categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id))
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id))
);

-- 2. Fix UPDATE policy on products
DROP POLICY IF EXISTS "Admins and owners can update tenant products" ON public.products;
CREATE POLICY "Admins and owners can update tenant products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id))
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id))
);

-- 3. Remove the SECURITY DEFINER view
DROP VIEW IF EXISTS public.products_admin_costs;

-- 4. Create RPC admin_product_costs()
CREATE OR REPLACE FUNCTION public.admin_product_costs()
RETURNS TABLE(id uuid, cost_price numeric, wholesale_price numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem acessar custos de produtos';
  END IF;

  RETURN QUERY
  SELECT p.id, p.cost_price, p.wholesale_price
  FROM public.products p;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_product_costs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_product_costs() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_product_costs() TO authenticated;