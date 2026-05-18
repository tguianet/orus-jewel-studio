CREATE TABLE public.store_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  image_url text,
  cta_label text,
  cta_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active popups"
  ON public.store_popups FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage popups"
  ON public.store_popups FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER store_popups_updated_at
  BEFORE UPDATE ON public.store_popups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();