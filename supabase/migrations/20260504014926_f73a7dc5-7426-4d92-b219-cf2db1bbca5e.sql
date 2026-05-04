
-- Demo: allow anon updates to seller_stores so customization page works without real auth
CREATE POLICY "Demo panel can update stores"
ON public.seller_stores
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
