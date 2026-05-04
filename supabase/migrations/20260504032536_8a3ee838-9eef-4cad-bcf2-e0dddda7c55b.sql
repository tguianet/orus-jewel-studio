
-- 1) origin column on orders
DO $$ BEGIN
  CREATE TYPE public.order_origin AS ENUM ('loja_online','whatsapp','manual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origin public.order_origin NOT NULL DEFAULT 'loja_online';

-- 2) Replace handle_new_user to also create reseller row + link parent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  meta_role text := COALESCE(NEW.raw_user_meta_data ->> 'role', 'sacoleira');
  parent_uuid uuid := NULLIF(NEW.raw_user_meta_data ->> 'parent_reseller_id','')::uuid;
  display text := COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email,'@',1),'');
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, display, NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT DO NOTHING;

  IF meta_role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sacoleira')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.resellers (user_id, display_name, email, phone, parent_id, status)
    VALUES (NEW.id, display, NEW.email, NEW.raw_user_meta_data ->> 'phone', parent_uuid, 'approved')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Attach order triggers (functions already exist)
DROP TRIGGER IF EXISTS trg_orders_created_commissions ON public.orders;
CREATE TRIGGER trg_orders_created_commissions
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_created_commissions();

DROP TRIGGER IF EXISTS trg_orders_release_wallet ON public.orders;
CREATE TRIGGER trg_orders_release_wallet
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.release_wallet_for_paid_order();

-- attach updated_at triggers where useful
DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_seller_stores_updated ON public.seller_stores;
CREATE TRIGGER trg_seller_stores_updated BEFORE UPDATE ON public.seller_stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) wallet summary view
CREATE OR REPLACE VIEW public.reseller_wallet_summary
WITH (security_invoker = true) AS
SELECT
  reseller_id,
  COALESCE(SUM(amount) FILTER (WHERE status='pending'),0)   AS pending,
  COALESCE(SUM(amount) FILTER (WHERE status='available'),0) AS available,
  COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)      AS paid,
  COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','available')),0) AS total_balance
FROM public.wallet_transactions
GROUP BY reseller_id;

-- 5) Drop demo anon policy that allowed any anon update on stores
DROP POLICY IF EXISTS "Demo panel can update stores" ON public.seller_stores;

-- 6) Allow sacoleiras to insert categories/products link tables when needed (already covered).
-- Allow public read of resellers parent chain (needed for downline UI is owner-only — already ok).
