INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Product images are publicly visible" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be uploaded from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be updated from admin panel" ON storage.objects;
DROP POLICY IF EXISTS "Product images can be deleted from admin panel" ON storage.objects;

CREATE POLICY "Product images are publicly visible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Product images can be uploaded from admin panel"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Product images can be updated from admin panel"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Product images can be deleted from admin panel"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'product-images');