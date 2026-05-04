
-- Create public bucket for store customization assets (banners and logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Store assets are publicly visible"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

-- Permissive upload/update/delete (mock-auth demo)
CREATE POLICY "Store assets can be uploaded"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Store assets can be updated"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-assets');

CREATE POLICY "Store assets can be deleted"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-assets');
