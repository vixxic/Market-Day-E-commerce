ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS gambar_list jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.products
SET gambar_list = CASE
  WHEN gambar IS NULL THEN '[]'::jsonb
  WHEN jsonb_typeof(to_jsonb(gambar)) = 'array' THEN to_jsonb(gambar)
  WHEN jsonb_typeof(to_jsonb(gambar)) = 'string'
    AND to_jsonb(gambar) <> '""'::jsonb
    THEN jsonb_build_array(to_jsonb(gambar))
  ELSE '[]'::jsonb
END
WHERE gambar_list = '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
