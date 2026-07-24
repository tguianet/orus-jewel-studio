-- Restrict anon SELECT on seller_stores to non-sensitive columns only.
-- Prevents public exposure of contact_phone, owner_user_id, reseller_id, commission_rate.
REVOKE SELECT ON public.seller_stores FROM anon;
GRANT SELECT (id, store_name, store_slug, status, tier, theme, created_at, updated_at)
  ON public.seller_stores TO anon;