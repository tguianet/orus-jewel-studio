-- Store visual templates (Lovable Cloud)
-- Adds seller_stores.template_key without changing RLS policies or protected columns.
-- Apply manually in Lovable Cloud. Do not run via supabase CLI.

-- 1) Column with safe default for existing + new rows
ALTER TABLE public.seller_stores
  ADD COLUMN IF NOT EXISTS template_key text NOT NULL DEFAULT 'elegance';

-- 2) Backfill any unexpected nulls (defensive; NOT NULL + DEFAULT should cover)
UPDATE public.seller_stores
SET template_key = 'elegance'
WHERE template_key IS NULL
   OR btrim(template_key) = '';

-- 3) Allowed values only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seller_stores_template_key_check'
      AND conrelid = 'public.seller_stores'::regclass
  ) THEN
    ALTER TABLE public.seller_stores
      ADD CONSTRAINT seller_stores_template_key_check
      CHECK (template_key IN ('elegance', 'boutique', 'minimal'));
  END IF;
END $$;

-- 4) Columnar grants (anon already has limited SELECT columns)
GRANT SELECT (template_key) ON public.seller_stores TO anon;
GRANT SELECT (template_key) ON public.seller_stores TO authenticated;

COMMENT ON COLUMN public.seller_stores.template_key IS
  'Visual storefront template: elegance | boutique | minimal';
