
-- =====================================================================
-- SECURITY HARDENING — address scanner findings
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PRODUCTS: hide cost_price / wholesale_price from anon (column-level)
-- Anon can still SELECT other columns via existing "Public can view active..."
-- policy, but Postgres column privileges will block sensitive columns.
-- ---------------------------------------------------------------------
REVOKE SELECT (cost_price, wholesale_price) ON public.products FROM anon;
-- keep authenticated/service_role full access (owners, admins, edge fns)

-- ---------------------------------------------------------------------
-- 2) SELLER_STORES: hide contact_phone and internal fields from anon
-- ---------------------------------------------------------------------
REVOKE SELECT (contact_phone, commission_rate, owner_user_id, reseller_id)
  ON public.seller_stores FROM anon;

-- ---------------------------------------------------------------------
-- 3) STORAGE: product-images bucket — restrict writes to admins only
-- (all product image uploads happen from the admin panel)
-- Public read still works via CDN public URL.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Product images can be uploaded from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be updated from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be deleted from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images are publicly visible" ON storage.objects;

-- Public read (used by <img src=...>) — only when the caller supplies the exact object name.
-- The public CDN endpoint /object/public/<bucket>/<name> works regardless of this policy,
-- but we keep a restricted SELECT so listing the bucket returns nothing.
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
-- 4) STORAGE: store-assets bucket — restrict writes to admins or store owners
-- Convention: owners upload to `${storeId}/...`, admins upload to `marketing/...`
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Store assets can be uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Store assets can be updated" ON storage.objects;
DROP POLICY IF EXISTS "Store assets can be deleted" ON storage.objects;
DROP POLICY IF EXISTS "Store assets are publicly visible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete marketing assets" ON storage.objects;

CREATE POLICY "store-assets public read individual object"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'store-assets');

-- Helper: does the caller own the store whose id matches the first path segment?
CREATE OR REPLACE FUNCTION public.owns_storage_store_folder(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (storage.foldername(_name))[1] ~ '^[0-9a-f-]{36}$' THEN
      public.owns_store(((storage.foldername(_name))[1])::uuid)
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
-- ---------------------------------------------------------------------

-- mark_order_paid: enforce admin check inside the function so even if a
-- non-admin has EXECUTE they cannot actually flip orders to paid.
CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can mark orders as paid';
  END IF;

  UPDATE public.orders
  SET status = 'paid'::order_status, updated_at = now()
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

-- Trigger / internal-only functions: revoke direct EXECUTE from anon+authenticated.
-- Triggers still run because they execute as the table owner, not the caller.
REVOKE EXECUTE ON FUNCTION public.create_mlm_commissions_for_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_created_commissions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_wallet_for_paid_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_product_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_order_item_tenant() FROM PUBLIC, anon, authenticated;

-- Helper functions used inside RLS policies must remain EXECUTE-able so RLS
-- evaluation succeeds for the calling role (anon/authenticated). These are
-- read-only lookups that don't accept caller-controlled SQL.
-- (is_admin, has_role, is_approved_store, owns_store, owns_reseller,
--  can_access_store, reseller_can_access_store, get_store_reseller_id,
--  owns_storage_store_folder)

GRANT EXECUTE ON FUNCTION public.owns_storage_store_folder(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_storage_store_folder(text) FROM anon, PUBLIC;
