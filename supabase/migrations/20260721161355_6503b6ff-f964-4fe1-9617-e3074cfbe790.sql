-- =====================================================================
-- SECURITY HARDENING — address scanner findings
-- NÃO toca create_public_order (checkout_token / 7 args / idempotência).
-- NÃO fecha INSERT público em orders (fica para phase2_orders_security).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PRODUCTS: hide cost_price / wholesale_price from anon (column-level)
-- Já parcialmente coberto por 20260720040000 (GRANT seletivo).
-- REVOKE idempotente garante o bloqueio mesmo se grants forem reabertos.
-- authenticated mantém SELECT completo (RLS limita linhas).
-- ---------------------------------------------------------------------
REVOKE SELECT (cost_price, wholesale_price) ON public.products FROM anon;

-- ---------------------------------------------------------------------
-- 2) SELLER_STORES: hide contact / internal fields from anon
-- Padrão seguro: revoga SELECT total e re-concede só colunas públicas.
-- Telefone WhatsApp público deve vir de theme.whatsapp (frontend já faz).
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.seller_stores FROM anon;
GRANT SELECT (
  id,
  store_name,
  store_slug,
  status,
  tier,
  theme,
  created_at,
  updated_at
) ON public.seller_stores TO anon;

-- authenticated mantém SELECT completo (RLS limita linhas)
GRANT SELECT ON public.seller_stores TO authenticated;

-- ---------------------------------------------------------------------
-- 3) STORAGE: product-images — writes só admin; read público
-- Remove policies antigas E as criadas em 20260720040000 (evita duplicata).
-- CDN /object/public/<bucket>/<name> continua funcionando em bucket public.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Product images can be uploaded from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be updated from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be deleted from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images are publicly visible" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "product-images public read individual object" ON storage.objects;
DROP POLICY IF EXISTS "product-images admins can insert" ON storage.objects;
DROP POLICY IF EXISTS "product-images admins can update" ON storage.objects;
DROP POLICY IF EXISTS "product-images admins can delete" ON storage.objects;

CREATE POLICY "product-images public read individual object"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "product-images admins can insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "product-images admins can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "product-images admins can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

-- ---------------------------------------------------------------------
-- 4) STORAGE: store-assets — admin ou dono da pasta `${storeId}/...`
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Store assets can be uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Store assets can be updated" ON storage.objects;
DROP POLICY IF EXISTS "Store assets can be deleted" ON storage.objects;
DROP POLICY IF EXISTS "Store assets are publicly visible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload store assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update store assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete store assets" ON storage.objects;
DROP POLICY IF EXISTS "store-assets public read individual object" ON storage.objects;
DROP POLICY IF EXISTS "store-assets admin or owner can insert" ON storage.objects;
DROP POLICY IF EXISTS "store-assets admin or owner can update" ON storage.objects;
DROP POLICY IF EXISTS "store-assets admin or owner can delete" ON storage.objects;

CREATE POLICY "store-assets public read individual object"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'store-assets');

-- Helper: dono da loja cujo id é o 1º segmento do path
CREATE OR REPLACE FUNCTION public.owns_storage_store_folder(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (storage.foldername(_name))[1]
         ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.owns_store(((storage.foldername(_name))[1])::uuid)
    ELSE false
  END
$$;

CREATE POLICY "store-assets admin or owner can insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-assets'
    AND (public.is_admin() OR public.owns_storage_store_folder(name))
  );

CREATE POLICY "store-assets admin or owner can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND (public.is_admin() OR public.owns_storage_store_folder(name))
  )
  WITH CHECK (
    bucket_id = 'store-assets'
    AND (public.is_admin() OR public.owns_storage_store_folder(name))
  );

CREATE POLICY "store-assets admin or owner can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND (public.is_admin() OR public.owns_storage_store_folder(name))
  );

-- ---------------------------------------------------------------------
-- 5) SECURITY DEFINER hardening
-- mark_order_paid: reforça admin (não regride vs 20260720040000).
-- NÃO altera create_public_order.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem marcar pedidos como pagos';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id) THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  UPDATE public.orders
  SET status = 'paid'::public.order_status, updated_at = now()
  WHERE id = _order_id;

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
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_paid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO service_role;

-- Trigger / internal-only: revoga EXECUTE direto (triggers rodam como owner)
REVOKE EXECUTE ON FUNCTION public.create_mlm_commissions_for_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_created_commissions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_wallet_for_paid_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_product_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_order_item_tenant() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.owns_storage_store_folder(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_storage_store_folder(text) FROM anon, PUBLIC;
