ALTER TABLE public.seller_stores DROP CONSTRAINT IF EXISTS seller_stores_owner_user_id_fkey;
ALTER TABLE public.resellers DROP CONSTRAINT IF EXISTS resellers_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;