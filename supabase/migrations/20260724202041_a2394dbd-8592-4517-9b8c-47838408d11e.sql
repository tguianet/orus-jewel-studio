
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_images_max_5;
ALTER TABLE public.products ADD CONSTRAINT products_images_max_5
  CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 5);

ALTER TABLE public.store_products DROP CONSTRAINT IF EXISTS store_products_images_max_5;
ALTER TABLE public.store_products ADD CONSTRAINT store_products_images_max_5
  CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 5);
