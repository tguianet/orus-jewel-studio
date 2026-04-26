-- Aura Store Suite production-ready entities for resellers, store products, MLM commissions and wallet

CREATE TABLE IF NOT EXISTS public.resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  status seller_store_status NOT NULL DEFAULT 'pending'::seller_store_status,
  tier text NOT NULL DEFAULT 'padrão',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_stores
  ADD COLUMN IF NOT EXISTS reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_store_id uuid NOT NULL REFERENCES public.seller_stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  resale_price numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_store_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  source_reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  level integer NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commissions_level_check CHECK (level IN (1, 2, 3)),
  CONSTRAINT commissions_rate_check CHECK (
    (level = 1 AND rate = 0.10) OR
    (level = 2 AND rate = 0.05) OR
    (level = 3 AND rate = 0.02)
  ),
  CONSTRAINT commissions_status_check CHECK (status IN ('pending', 'available', 'paid', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  commission_id uuid REFERENCES public.commissions(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'commission',
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_type_check CHECK (type IN ('commission', 'withdrawal', 'adjustment')),
  CONSTRAINT wallet_transactions_status_check CHECK (status IN ('pending', 'available', 'paid', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_resellers_user_id ON public.resellers(user_id);
CREATE INDEX IF NOT EXISTS idx_resellers_parent_id ON public.resellers(parent_id);
CREATE INDEX IF NOT EXISTS idx_seller_stores_reseller_id ON public.seller_stores(reseller_id);
CREATE INDEX IF NOT EXISTS idx_store_products_store_id ON public.store_products(seller_store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_product_id ON public.store_products(product_id);
CREATE INDEX IF NOT EXISTS idx_commissions_reseller_id ON public.commissions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_commissions_order_id ON public.commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reseller_id ON public.wallet_transactions(reseller_id);

CREATE OR REPLACE FUNCTION public.owns_reseller(_reseller_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resellers r
    WHERE r.id = _reseller_id
      AND r.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.reseller_can_access_store(_store_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.seller_stores s
      LEFT JOIN public.resellers r ON r.id = s.reseller_id
      WHERE s.id = _store_id
        AND (s.owner_user_id = _user_id OR r.user_id = _user_id)
    )
$$;

ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage resellers" ON public.resellers;
DROP POLICY IF EXISTS "Resellers can view own record" ON public.resellers;
DROP POLICY IF EXISTS "Resellers can update own record" ON public.resellers;
DROP POLICY IF EXISTS "Admins can manage store products" ON public.store_products;
DROP POLICY IF EXISTS "Store owners can manage store products" ON public.store_products;
DROP POLICY IF EXISTS "Public can view active store products" ON public.store_products;
DROP POLICY IF EXISTS "Admins can manage commissions" ON public.commissions;
DROP POLICY IF EXISTS "Resellers can view own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can manage wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Resellers can view own wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Admins can manage resellers"
ON public.resellers FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Resellers can view own record"
ON public.resellers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Resellers can update own record"
ON public.resellers FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can manage store products"
ON public.store_products FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Store owners can manage store products"
ON public.store_products FOR ALL TO authenticated
USING (public.reseller_can_access_store(seller_store_id))
WITH CHECK (public.reseller_can_access_store(seller_store_id));

CREATE POLICY "Public can view active store products"
ON public.store_products FOR SELECT TO public
USING (active = true AND public.is_approved_store(seller_store_id));

CREATE POLICY "Admins can manage commissions"
ON public.commissions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Resellers can view own commissions"
ON public.commissions FOR SELECT TO authenticated
USING (public.owns_reseller(reseller_id));

CREATE POLICY "Admins can manage wallet transactions"
ON public.wallet_transactions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Resellers can view own wallet transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (public.owns_reseller(reseller_id));

DROP TRIGGER IF EXISTS update_resellers_updated_at ON public.resellers;
CREATE TRIGGER update_resellers_updated_at
BEFORE UPDATE ON public.resellers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_products_updated_at ON public.store_products;
CREATE TRIGGER update_store_products_updated_at
BEFORE UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_commissions_updated_at ON public.commissions;
CREATE TRIGGER update_commissions_updated_at
BEFORE UPDATE ON public.commissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_transactions_updated_at ON public.wallet_transactions;
CREATE TRIGGER update_wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();