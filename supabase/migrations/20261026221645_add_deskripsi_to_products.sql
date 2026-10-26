ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS deskripsi text;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS kategori jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rasa jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ukuran jsonb NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
