-- Promo per produk.
--
-- Bentuk isi kolom (jsonb), keduanya opsional:
--   { "jenis": "beli_gratis", "beli": 1, "gratis": 1 }
--   { "jenis": "diskon_jumlah", "minJumlah": 5, "tipe": "persen", "nilai": 10 }
--
-- Kolom dibiarkan nullable: NULL berarti produk tidak sedang promo.
-- Aplikasi tetap berjalan sebelum migrasi ini diterapkan (promo dianggap
-- tidak ada), tetapi penjual baru bisa menyimpan promo setelah menjalankannya.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promo jsonb;

NOTIFY pgrst, 'reload schema';
