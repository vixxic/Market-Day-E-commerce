ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stok integer NOT NULL DEFAULT 0
CHECK (stok >= 0);

NOTIFY pgrst, 'reload schema';
