-- Multi-tenant hardening by seller store, idempotent version

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS seller_store_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_store_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_store_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_seller_store_id_fkey') THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_seller_store_id_fkey
      FOREIGN KEY (seller_store_id) REFERENCES public.seller_stores(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_seller_store_id_fkey') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_seller_store_id_fkey
      FOREIGN KEY (seller_store_id) REFERENCES public.seller_stores(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_seller_store_id_fkey') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_seller_store_id_fkey
      FOREIGN KEY (seller_store_id) REFERENCES public.seller_stores(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_seller_store_id_fkey') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_seller_store_id_fkey
      FOREIGN KEY (seller_store_id) REFERENCES public.seller_stores(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_id_fkey') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.owns_store(_store_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_stores s
    WHERE s.id = _store_id
      AND s.owner_user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_store(_store_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR public.owns_store(_store_id, _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_approved_store(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_stores s
    WHERE s.id = _store_id
      AND s.status = 'approved'::seller_store_status
  )
$$;

CREATE OR REPLACE FUNCTION public.validate_product_tenant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  category_store_id uuid;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT c.seller_store_id INTO category_store_id
    FROM public.categories c
    WHERE c.id = NEW.category_id;

    IF category_store_id IS NOT NULL AND category_store_id IS DISTINCT FROM NEW.seller_store_id THEN
      RAISE EXCEPTION 'Product category belongs to another store';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_tenant_trigger ON public.products;
CREATE TRIGGER validate_product_tenant_trigger
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.validate_product_tenant();

CREATE OR REPLACE FUNCTION public.validate_order_item_tenant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  order_store_id uuid;
  product_store_id uuid;
BEGIN
  SELECT o.seller_store_id INTO order_store_id
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  IF order_store_id IS NULL THEN
    RAISE EXCEPTION 'Order not found for item';
  END IF;

  IF NEW.seller_store_id IS NULL THEN
    NEW.seller_store_id := order_store_id;
  END IF;

  IF NEW.seller_store_id IS DISTINCT FROM order_store_id THEN
    RAISE EXCEPTION 'Order item belongs to another store';
  END IF;

  IF NEW.product_id IS NOT NULL THEN
    SELECT p.seller_store_id INTO product_store_id
    FROM public.products p
    WHERE p.id = NEW.product_id;

    IF product_store_id IS NOT NULL AND product_store_id IS DISTINCT FROM order_store_id THEN
      RAISE EXCEPTION 'Order item product belongs to another store';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_item_tenant_trigger ON public.order_items;
CREATE TRIGGER validate_order_item_tenant_trigger
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_item_tenant();

CREATE INDEX IF NOT EXISTS idx_categories_seller_store_id ON public.categories(seller_store_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_store_id ON public.products(seller_store_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_store_id ON public.orders(seller_store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_store_id ON public.order_items(seller_store_id);
CREATE INDEX IF NOT EXISTS idx_seller_stores_owner_user_id ON public.seller_stores(owner_user_id);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant categories are visible to owners and admins" ON public.categories;
DROP POLICY IF EXISTS "Admins and owners can create tenant categories" ON public.categories;
DROP POLICY IF EXISTS "Admins and owners can update tenant categories" ON public.categories;
DROP POLICY IF EXISTS "Admins and owners can delete tenant categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view active public or approved store categories" ON public.categories;

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Tenant products are visible to owners and admins" ON public.products;
DROP POLICY IF EXISTS "Admins and owners can create tenant products" ON public.products;
DROP POLICY IF EXISTS "Admins and owners can update tenant products" ON public.products;
DROP POLICY IF EXISTS "Admins and owners can delete tenant products" ON public.products;
DROP POLICY IF EXISTS "Public can view active public or approved store products" ON public.products;

DROP POLICY IF EXISTS "Admins and store owners can view orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and store owners can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create public store orders" ON public.orders;
DROP POLICY IF EXISTS "Tenant orders are visible to owners and admins" ON public.orders;
DROP POLICY IF EXISTS "Tenant orders are updatable by owners and admins" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete tenant orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create approved store orders" ON public.orders;

DROP POLICY IF EXISTS "Admins and store owners can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins and store owners can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create public order items" ON public.order_items;
DROP POLICY IF EXISTS "Tenant order items are visible to owners and admins" ON public.order_items;
DROP POLICY IF EXISTS "Tenant order items are updatable by owners and admins" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete tenant order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can create approved store order items" ON public.order_items;

CREATE POLICY "Tenant categories are visible to owners and admins"
ON public.categories FOR SELECT TO authenticated
USING (seller_store_id IS NULL OR public.can_access_store(seller_store_id));

CREATE POLICY "Admins and owners can create tenant categories"
ON public.categories FOR INSERT TO authenticated
WITH CHECK (public.is_admin() OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id)));

CREATE POLICY "Admins and owners can update tenant categories"
ON public.categories FOR UPDATE TO authenticated
USING (seller_store_id IS NULL OR public.can_access_store(seller_store_id))
WITH CHECK (public.is_admin() OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id)));

CREATE POLICY "Admins and owners can delete tenant categories"
ON public.categories FOR DELETE TO authenticated
USING (public.is_admin() OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id)));

CREATE POLICY "Public can view active public or approved store categories"
ON public.categories FOR SELECT TO public
USING (active = true AND (seller_store_id IS NULL OR public.is_approved_store(seller_store_id)));

CREATE POLICY "Tenant products are visible to owners and admins"
ON public.products FOR SELECT TO authenticated
USING (seller_store_id IS NULL OR public.can_access_store(seller_store_id));

CREATE POLICY "Admins and owners can create tenant products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (public.is_admin() OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id)));

CREATE POLICY "Admins and owners can update tenant products"
ON public.products FOR UPDATE TO authenticated
USING (seller_store_id IS NULL OR public.can_access_store(seller_store_id))
WITH CHECK (public.is_admin() OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id)));

CREATE POLICY "Admins and owners can delete tenant products"
ON public.products FOR DELETE TO authenticated
USING (public.is_admin() OR (seller_store_id IS NOT NULL AND public.owns_store(seller_store_id)));

CREATE POLICY "Public can view active public or approved store products"
ON public.products FOR SELECT TO public
USING (status = 'active'::product_status AND (seller_store_id IS NULL OR public.is_approved_store(seller_store_id)));

CREATE POLICY "Tenant orders are visible to owners and admins"
ON public.orders FOR SELECT TO authenticated
USING (public.can_access_store(seller_store_id));

CREATE POLICY "Tenant orders are updatable by owners and admins"
ON public.orders FOR UPDATE TO authenticated
USING (public.can_access_store(seller_store_id))
WITH CHECK (public.can_access_store(seller_store_id));

CREATE POLICY "Admins can delete tenant orders"
ON public.orders FOR DELETE TO authenticated
USING (public.is_admin());

CREATE POLICY "Public can create approved store orders"
ON public.orders FOR INSERT TO public
WITH CHECK (public.is_approved_store(seller_store_id));

CREATE POLICY "Tenant order items are visible to owners and admins"
ON public.order_items FOR SELECT TO authenticated
USING (public.can_access_store(seller_store_id));

CREATE POLICY "Tenant order items are updatable by owners and admins"
ON public.order_items FOR UPDATE TO authenticated
USING (public.can_access_store(seller_store_id))
WITH CHECK (public.can_access_store(seller_store_id));

CREATE POLICY "Admins can delete tenant order items"
ON public.order_items FOR DELETE TO authenticated
USING (public.is_admin());

CREATE POLICY "Public can create approved store order items"
ON public.order_items FOR INSERT TO public
WITH CHECK (public.is_approved_store(seller_store_id));