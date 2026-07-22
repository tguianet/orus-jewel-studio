DROP POLICY IF EXISTS "Admin panel can create public products" ON public.products;
CREATE POLICY "Admin panel can create public products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (seller_store_id IS NULL AND public.is_admin(auth.uid()));