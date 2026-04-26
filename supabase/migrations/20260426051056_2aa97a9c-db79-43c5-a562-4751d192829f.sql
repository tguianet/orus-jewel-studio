-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'sacoleira');
CREATE TYPE public.seller_store_status AS ENUM ('pending', 'approved', 'blocked');
CREATE TYPE public.product_status AS ENUM ('active', 'inactive');
CREATE TYPE public.order_status AS ENUM ('new', 'confirmed', 'paid', 'separated', 'shipped', 'delivered', 'cancelled');

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles table separated from profiles/users
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1), ''),
    NEW.raw_user_meta_data ->> 'phone'
  );

  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'sacoleira') = 'sacoleira' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'sacoleira')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seller stores
CREATE TABLE public.seller_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL UNIQUE,
  contact_phone TEXT,
  status public.seller_store_status NOT NULL DEFAULT 'pending',
  tier TEXT NOT NULL DEFAULT 'padrão',
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seller_stores_slug_format CHECK (store_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT seller_stores_commission_rate_valid CHECK (commission_rate >= 0 AND commission_rate <= 100)
);

ALTER TABLE public.seller_stores ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Products
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  suggested_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_order INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  status public.product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_prices_valid CHECK (cost_price >= 0 AND wholesale_price >= 0 AND suggested_price >= 0),
  CONSTRAINT products_stock_valid CHECK (stock >= 0),
  CONSTRAINT products_min_order_valid CHECK (min_order >= 1)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_store_id UUID NOT NULL REFERENCES public.seller_stores(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_amounts_valid CHECK (subtotal >= 0 AND discount >= 0 AND total >= 0)
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_valid CHECK (quantity >= 1),
  CONSTRAINT order_items_amounts_valid CHECK (unit_price >= 0 AND total >= 0)
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_seller_stores_owner_user_id ON public.seller_stores(owner_user_id);
CREATE INDEX idx_seller_stores_slug ON public.seller_stores(store_slug);
CREATE INDEX idx_categories_active ON public.categories(active);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_orders_seller_store_id ON public.orders(seller_store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seller_stores_updated_at BEFORE UPDATE ON public.seller_stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles policies
CREATE POLICY "Users can view their own profile or admins view all"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update their own profile or admins update all"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Roles policies
CREATE POLICY "Users can view their own roles or admins view all"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Seller store policies
CREATE POLICY "Public can view approved stores"
ON public.seller_stores FOR SELECT
USING (status = 'approved');

CREATE POLICY "Owners and admins can view stores"
ON public.seller_stores FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id OR public.is_admin());

CREATE POLICY "Sacoleiras can create their own store"
ON public.seller_stores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_user_id AND public.has_role(auth.uid(), 'sacoleira'));

CREATE POLICY "Owners can update their store"
ON public.seller_stores FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admins can manage all stores"
ON public.seller_stores FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Category policies
CREATE POLICY "Public can view active categories"
ON public.categories FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Product policies
CREATE POLICY "Public can view active products"
ON public.products FOR SELECT
USING (status = 'active');

CREATE POLICY "Admins can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Order policies
CREATE POLICY "Anyone can create public store orders"
ON public.orders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.id = seller_store_id
      AND s.status = 'approved'
  )
);

CREATE POLICY "Admins and store owners can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.id = seller_store_id
      AND s.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Admins and store owners can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.id = seller_store_id
      AND s.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.seller_stores s
    WHERE s.id = seller_store_id
      AND s.owner_user_id = auth.uid()
  )
);

-- Order item policies
CREATE POLICY "Anyone can create public order items"
ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.seller_stores s ON s.id = o.seller_store_id
    WHERE o.id = order_id
      AND s.status = 'approved'
  )
);

CREATE POLICY "Admins and store owners can view order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.seller_stores s ON s.id = o.seller_store_id
    WHERE o.id = order_id
      AND s.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Admins and store owners can update order items"
ON public.order_items FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.seller_stores s ON s.id = o.seller_store_id
    WHERE o.id = order_id
      AND s.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.seller_stores s ON s.id = o.seller_store_id
    WHERE o.id = order_id
      AND s.owner_user_id = auth.uid()
  )
);