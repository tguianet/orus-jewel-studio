ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_name text;

UPDATE public.products p
SET category_name = c.name
FROM public.categories c
WHERE p.category_id = c.id
  AND p.category_name IS NULL;