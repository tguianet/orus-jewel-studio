-- =============================================================================
-- Órus Jewel Studio — Security / RLS hardening (incremental, non-destructive)
-- Não recria tabelas. Não apaga dados. Corrige privilégios, políticas e triggers.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Funções auxiliares (SECURITY DEFINER + search_path fixo)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.current_reseller_id(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id
  FROM public.resellers r
  WHERE r.user_id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_store_id(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.seller_stores s
  WHERE s.owner_user_id = _user_id
  LIMIT 1;
$$;

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
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_order(_order_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND (
        public.is_admin(_user_id)
        OR public.owns_store(o.seller_store_id, _user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_reseller_in_my_network(_reseller_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id FROM public.resellers WHERE user_id = _user_id LIMIT 1
  ),
  lvl1 AS (
    SELECT r.id FROM public.resellers r, me WHERE r.parent_id = me.id
  ),
  lvl2 AS (
    SELECT r.id FROM public.resellers r WHERE r.parent_id IN (SELECT id FROM lvl1)
  ),
  lvl3 AS (
    SELECT r.id FROM public.resellers r WHERE r.parent_id IN (SELECT id FROM lvl2)
  )
  SELECT EXISTS (
    SELECT 1 FROM me WHERE me.id = _reseller_id
    UNION ALL
    SELECT 1 FROM lvl1 WHERE id = _reseller_id
    UNION ALL
    SELECT 1 FROM lvl2 WHERE id = _reseller_id
    UNION ALL
    SELECT 1 FROM lvl3 WHERE id = _reseller_id
  );
$$;

CREATE OR REPLACE FUNCTION public.lookup_reseller_sponsor(_id uuid)
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.display_name
  FROM public.resellers r
  WHERE r.id = _id
    AND r.status = 'approved'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.set_my_reseller_parent(_parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_id uuid;
  my_parent uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT r.id, r.parent_id INTO my_id, my_parent
  FROM public.resellers r
  WHERE r.user_id = auth.uid()
  LIMIT 1;

  IF my_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de sacoleira não encontrado';
  END IF;

  IF my_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Indicação já definida e não pode ser alterada';
  END IF;

  IF _parent_id = my_id THEN
    RAISE EXCEPTION 'Você não pode se indicar';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.resellers r
    WHERE r.id = _parent_id AND r.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Indicação não encontrada ou inativa';
  END IF;

  UPDATE public.resellers
  SET parent_id = _parent_id, updated_at = now()
  WHERE id = my_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Cadastro seguro — nunca promover admin via metadata
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_uuid uuid := NULL;
  parent_raw text := NULLIF(NEW.raw_user_meta_data ->> 'parent_reseller_id', '');
  display text := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1),
    ''
  );
  phone_text text := NEW.raw_user_meta_data ->> 'phone';
  base_slug text;
  final_slug text;
  i int := 0;
  reseller_uuid uuid;
BEGIN
  IF parent_raw IS NOT NULL THEN
    BEGIN
      parent_uuid := parent_raw::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      parent_uuid := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, display, phone_text)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sacoleira'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF parent_uuid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.resellers r
    WHERE r.id = parent_uuid AND r.status = 'approved'
  ) THEN
    parent_uuid := NULL;
  END IF;

  INSERT INTO public.resellers (user_id, display_name, email, phone, parent_id, status)
  VALUES (NEW.id, display, NEW.email, phone_text, parent_uuid, 'pending')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO reseller_uuid;

  IF reseller_uuid IS NULL THEN
    SELECT id INTO reseller_uuid FROM public.resellers WHERE user_id = NEW.id LIMIT 1;
  END IF;

  base_slug := regexp_replace(lower(coalesce(display, split_part(NEW.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'loja';
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.seller_stores WHERE store_slug = final_slug) LOOP
    i := i + 1;
    final_slug := base_slug || '-' || i::text;
  END LOOP;

  INSERT INTO public.seller_stores (
    owner_user_id, reseller_id, store_name, store_slug, contact_phone, status, theme
  )
  SELECT
    NEW.id,
    reseller_uuid,
    COALESCE(display, 'Minha loja'),
    final_slug,
    phone_text,
    'pending'::public.seller_store_status,
    jsonb_build_object('primaryColor', '#d4a747', 'secondaryColor', '#f5e6c8')
  WHERE NOT EXISTS (
    SELECT 1 FROM public.seller_stores s WHERE s.owner_user_id = NEW.id
  );

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) mark_order_paid — somente admin autenticado
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
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

REVOKE ALL ON FUNCTION public.mark_order_paid(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_order_paid(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.create_mlm_commissions_for_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_mlm_commissions_for_order(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_mlm_commissions_for_order(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_mlm_commissions_for_order(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.lookup_reseller_sponsor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_reseller_parent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_reseller_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_store_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reseller_in_my_network(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Triggers de proteção de colunas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profiles_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'user_id não pode ser alterado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_columns ON public.profiles;
CREATE TRIGGER trg_protect_profiles_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profiles_columns();

CREATE OR REPLACE FUNCTION public.protect_user_roles_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente administradores podem gerenciar papéis';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.user_roles;
CREATE TRIGGER trg_protect_user_roles
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_roles_columns();

CREATE OR REPLACE FUNCTION public.protect_seller_stores_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NOT public.is_admin() THEN
    IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
      RAISE EXCEPTION 'owner_user_id não pode ser alterado';
    END IF;
    IF NEW.reseller_id IS DISTINCT FROM OLD.reseller_id THEN
      RAISE EXCEPTION 'reseller_id não pode ser alterado';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Somente administradores podem alterar o status da loja';
    END IF;
    IF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate THEN
      RAISE EXCEPTION 'commission_rate é protegido';
    END IF;
    IF NEW.tier IS DISTINCT FROM OLD.tier THEN
      RAISE EXCEPTION 'tier é protegido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_seller_stores_columns ON public.seller_stores;
CREATE TRIGGER trg_protect_seller_stores_columns
BEFORE UPDATE ON public.seller_stores
FOR EACH ROW
EXECUTE FUNCTION public.protect_seller_stores_columns();

CREATE OR REPLACE FUNCTION public.protect_resellers_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NOT public.is_admin() THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'user_id não pode ser alterado';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Somente administradores podem alterar o status da sacoleira';
    END IF;
    IF NEW.tier IS DISTINCT FROM OLD.tier THEN
      RAISE EXCEPTION 'tier é protegido';
    END IF;
    IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      IF OLD.parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Indicação já definida e não pode ser alterada';
      END IF;
      IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Sem permissão para alterar indicação';
      END IF;
      IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'Você não pode se indicar';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.resellers r
        WHERE r.id = NEW.parent_id AND r.status = 'approved'
      ) THEN
        RAISE EXCEPTION 'Indicação não encontrada ou inativa';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_resellers_columns ON public.resellers;
CREATE TRIGGER trg_protect_resellers_columns
BEFORE UPDATE ON public.resellers
FOR EACH ROW
EXECUTE FUNCTION public.protect_resellers_columns();

CREATE OR REPLACE FUNCTION public.protect_orders_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
      NEW.status := 'new'::public.order_status;
      IF NEW.discount IS NULL THEN
        NEW.discount := 0;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT public.is_admin() THEN
    IF NEW.seller_store_id IS DISTINCT FROM OLD.seller_store_id THEN
      RAISE EXCEPTION 'seller_store_id não pode ser alterado';
    END IF;
    IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.discount IS DISTINCT FROM OLD.discount
       OR NEW.total IS DISTINCT FROM OLD.total THEN
      RAISE EXCEPTION 'Campos financeiros do pedido são protegidos';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Somente administradores podem alterar o status do pedido';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_orders_columns ON public.orders;
CREATE TRIGGER trg_protect_orders_columns
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_orders_columns();

CREATE OR REPLACE FUNCTION public.protect_order_items_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  catalog_price numeric;
BEGIN
  IF TG_OP = 'INSERT' AND (auth.uid() IS NULL OR NOT public.is_admin()) THEN
    SELECT COALESCE(sp.resale_price, p.suggested_price, 0)
      INTO catalog_price
    FROM public.products p
    LEFT JOIN public.store_products sp
      ON sp.product_id = p.id
     AND sp.seller_store_id = NEW.seller_store_id
     AND sp.active = true
    WHERE p.id = NEW.product_id
    LIMIT 1;

    IF catalog_price IS NOT NULL AND NEW.product_id IS NOT NULL THEN
      NEW.unit_price := catalog_price;
      NEW.total := catalog_price * COALESCE(NEW.quantity, 1);
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT public.is_admin() THEN
    IF NEW.order_id IS DISTINCT FROM OLD.order_id
       OR NEW.seller_store_id IS DISTINCT FROM OLD.seller_store_id
       OR NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.unit_price IS DISTINCT FROM OLD.unit_price
       OR NEW.total IS DISTINCT FROM OLD.total
       OR NEW.quantity IS DISTINCT FROM OLD.quantity THEN
      RAISE EXCEPTION 'Itens de pedido são protegidos após a criação';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_items_columns ON public.order_items;
CREATE TRIGGER trg_protect_order_items_columns
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.protect_order_items_columns();

DROP TRIGGER IF EXISTS orders_create_mlm_commissions ON public.orders;
DROP TRIGGER IF EXISTS orders_release_wallet_on_paid ON public.orders;

-- ---------------------------------------------------------------------------
-- 5) Políticas RLS — remover permissivas e endurecer
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admin panel can create public products" ON public.products;

DROP POLICY IF EXISTS "Demo panel can update stores" ON public.seller_stores;

DROP POLICY IF EXISTS "Resellers can view own record" ON public.resellers;
DROP POLICY IF EXISTS "Resellers can view own network" ON public.resellers;
CREATE POLICY "Resellers can view own network"
ON public.resellers
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.is_reseller_in_my_network(id)
);

DROP POLICY IF EXISTS "Resellers can update own record" ON public.resellers;
DROP POLICY IF EXISTS "Resellers can update own profile fields" ON public.resellers;
CREATE POLICY "Resellers can update own profile fields"
ON public.resellers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Tenant orders are updatable by owners and admins" ON public.orders;
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
DROP POLICY IF EXISTS "Store owners can update own store order notes" ON public.orders;
CREATE POLICY "Admins can update any order"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Store owners can update own store order notes"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.owns_store(seller_store_id))
WITH CHECK (public.owns_store(seller_store_id));

DROP POLICY IF EXISTS "Tenant order items are updatable by owners and admins" ON public.order_items;
DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
CREATE POLICY "Admins can update order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Tenant orders are visible to owners and admins" ON public.orders;
CREATE POLICY "Tenant orders are visible to owners and admins"
ON public.orders
FOR SELECT
TO authenticated
USING (public.can_access_store(seller_store_id));

DROP POLICY IF EXISTS "Tenant order items are visible to owners and admins" ON public.order_items;
CREATE POLICY "Tenant order items are visible to owners and admins"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.can_access_store(seller_store_id));

DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;

DROP POLICY IF EXISTS "Public can create approved store orders" ON public.orders;
CREATE POLICY "Public can create approved store orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (public.is_approved_store(seller_store_id));

DROP POLICY IF EXISTS "Public can create approved store order items" ON public.order_items;
CREATE POLICY "Public can create approved store order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  seller_store_id IS NOT NULL
  AND public.is_approved_store(seller_store_id)
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND o.seller_store_id = order_items.seller_store_id
  )
);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6) Storage — fechar uploads anônimos
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Product images can be uploaded from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be updated from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be deleted from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin())
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Store assets can be uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Store assets can be updated" ON storage.objects;
DROP POLICY IF EXISTS "Store assets can be deleted" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload store assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update store assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete store assets" ON storage.objects;

CREATE POLICY "Authenticated can upload store assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.owns_store(((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Authenticated can update store assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.owns_store(((storage.foldername(name))[1])::uuid)
    )
  )
)
WITH CHECK (
  bucket_id = 'store-assets'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.owns_store(((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Authenticated can delete store assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.owns_store(((storage.foldername(name))[1])::uuid)
    )
  )
);

-- ---------------------------------------------------------------------------
-- 7) Colunas sensíveis de products — anon sem cost/wholesale
-- ---------------------------------------------------------------------------

REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id,
  category_id,
  category_name,
  code,
  name,
  description,
  suggested_price,
  stock,
  min_order,
  image_url,
  status,
  seller_store_id,
  created_at,
  updated_at
) ON public.products TO anon;

GRANT SELECT ON public.products TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Garantir RLS ativo em todas as tabelas de negócio
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_popups ENABLE ROW LEVEL SECURITY;