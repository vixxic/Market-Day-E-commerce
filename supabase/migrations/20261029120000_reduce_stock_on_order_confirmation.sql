ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stok integer NOT NULL DEFAULT 0
CHECK (stok >= 0);

CREATE OR REPLACE FUNCTION public.verifikasi_otp_dan_kurangi_stok(
  p_order_id uuid,
  p_otp_hash text,
  p_verified_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_order.status <> 'menunggu_otp'
    OR v_order.otp_hash IS DISTINCT FROM p_otp_hash
  THEN
    RETURN jsonb_build_object('result', 'conflict');
  END IF;

  PERFORM produk.id
  FROM public.products AS produk
  WHERE produk.id IN (
    SELECT (item->>'id_produk')::uuid
    FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) AS item
    GROUP BY (item->>'id_produk')::uuid
  )
  ORDER BY produk.id
  FOR UPDATE;

  IF EXISTS (
    WITH jumlah_pesanan AS (
      SELECT
        (item->>'id_produk')::uuid AS id_produk,
        SUM((item->>'jumlah')::integer)::integer AS jumlah
      FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) AS item
      GROUP BY (item->>'id_produk')::uuid
    )
    SELECT 1
    FROM jumlah_pesanan
    LEFT JOIN public.products AS produk ON produk.id = jumlah_pesanan.id_produk
    WHERE produk.id IS NULL OR produk.stok < jumlah_pesanan.jumlah
  ) THEN
    RETURN jsonb_build_object('result', 'stock_unavailable');
  END IF;

  WITH jumlah_pesanan AS (
    SELECT
      (item->>'id_produk')::uuid AS id_produk,
      SUM((item->>'jumlah')::integer)::integer AS jumlah
    FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) AS item
    GROUP BY (item->>'id_produk')::uuid
  )
  UPDATE public.products AS produk
  SET stok = produk.stok - jumlah_pesanan.jumlah
  FROM jumlah_pesanan
  WHERE produk.id = jumlah_pesanan.id_produk;

  UPDATE public.orders
  SET
    status = 'menunggu_konfirmasi',
    otp_verified_at = p_verified_at,
    otp_hash = NULL,
    otp_expires_at = NULL,
    otp_attempts = 0
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'result', 'success',
    'id', v_order.id,
    'status', 'menunggu_konfirmasi',
    'id_toko', v_order.id_toko
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verifikasi_otp_dan_kurangi_stok(uuid, text, timestamptz)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verifikasi_otp_dan_kurangi_stok(uuid, text, timestamptz)
TO service_role;

NOTIFY pgrst, 'reload schema';
