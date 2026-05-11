CREATE TABLE public.marketing_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active marketing banners"
ON public.marketing_banners FOR SELECT
USING (active = true);

CREATE POLICY "Admins can view all marketing banners"
ON public.marketing_banners FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can manage marketing banners"
ON public.marketing_banners FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE TRIGGER update_marketing_banners_updated_at
BEFORE UPDATE ON public.marketing_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow admins to upload to store-assets bucket under "marketing/" prefix
CREATE POLICY "Admins can upload marketing assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-assets' AND is_admin());

CREATE POLICY "Admins can update marketing assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-assets' AND is_admin());

CREATE POLICY "Admins can delete marketing assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-assets' AND is_admin());