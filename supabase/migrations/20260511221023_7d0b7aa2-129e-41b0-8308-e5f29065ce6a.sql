CREATE TABLE public.image_formats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1080,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.image_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active image formats"
ON public.image_formats FOR SELECT
USING (active = true);

CREATE POLICY "Admins can view all image formats"
ON public.image_formats FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can manage image formats"
ON public.image_formats FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE TRIGGER update_image_formats_updated_at
BEFORE UPDATE ON public.image_formats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.marketing_banners
  ADD COLUMN format_id UUID REFERENCES public.image_formats(id) ON DELETE SET NULL;

INSERT INTO public.image_formats (name, slug, width, height, description, sort_order) VALUES
  ('Banner da loja', 'banner-loja', 1600, 500, 'Carrossel da home da loja', 1),
  ('Instagram Post', 'instagram-post', 1080, 1080, 'Quadrado para o feed', 2),
  ('Instagram Story', 'instagram-story', 1080, 1920, 'Vertical para stories e reels', 3),
  ('Facebook Capa', 'facebook-capa', 1200, 628, 'Capa de página e posts', 4);

UPDATE public.marketing_banners
SET format_id = (SELECT id FROM public.image_formats WHERE slug = 'banner-loja')
WHERE format_id IS NULL;