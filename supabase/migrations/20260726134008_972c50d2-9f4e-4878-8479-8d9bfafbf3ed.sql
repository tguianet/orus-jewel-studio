GRANT SELECT (
  id, category_id, code, name, description, wholesale_price, suggested_price,
  stock, min_order, image_url, status, created_at, updated_at,
  seller_store_id, category_name, images
) ON public.products TO authenticated;

REVOKE SELECT ON public.products FROM authenticated;

GRANT SELECT (
  id, category_id, code, name, description, wholesale_price, suggested_price,
  stock, min_order, image_url, status, created_at, updated_at,
  seller_store_id, category_name, images
) ON public.products TO authenticated;