CREATE OR REPLACE FUNCTION public.tolak_atau_batalkan_pesanan(
  p_order_id uuid,
  p_id_toko uuid,
  p_status text
)
RETURNS boolean
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
    AND id_toko = p_id_toko
  FOR UPDATE;

  IF NOT FOUND
    OR (p_status = 'ditolak' AND v_order.status <> 'menunggu_konfirmasi')
    OR (p_status = 'dibatalkan' AND v_order.status <> 'diproses')
    OR p_status NOT IN ('ditolak', 'dibatalkan')
  THEN
    RETURN false;
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

  WITH jumlah_pesanan AS (
    SELECT
      (item->>'id_produk')::uuid AS id_produk,
      SUM((item->>'jumlah')::integer)::integer AS jumlah
    FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) AS item
    GROUP BY (item->>'id_produk')::uuid
  )
  UPDATE public.products AS produk
  SET stok = produk.stok + jumlah_pesanan.jumlah
  FROM jumlah_pesanan
  WHERE produk.id = jumlah_pesanan.id_produk;

  UPDATE public.orders
  SET status = p_status
  WHERE id = v_order.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.tolak_atau_batalkan_pesanan(uuid, uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.tolak_atau_batalkan_pesanan(uuid, uuid, text)
TO service_role;

NOTIFY pgrst, 'reload schema';
