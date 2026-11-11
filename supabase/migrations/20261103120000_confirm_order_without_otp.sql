CREATE OR REPLACE FUNCTION public.konfirmasi_pesanan_tanpa_otp(
  p_order_id uuid
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
    AND status = 'menunggu_otp'
    AND otp_hash IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
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
    DELETE FROM public.orders
    WHERE id = v_order.id
      AND status = 'menunggu_otp'
      AND otp_hash IS NULL;

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

REVOKE ALL ON FUNCTION public.konfirmasi_pesanan_tanpa_otp(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.konfirmasi_pesanan_tanpa_otp(uuid)
TO service_role;

NOTIFY pgrst, 'reload schema';
