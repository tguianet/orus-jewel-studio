ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_token uuid;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_token_uidx
  ON public.orders (checkout_token)
  WHERE checkout_token IS NOT NULL;