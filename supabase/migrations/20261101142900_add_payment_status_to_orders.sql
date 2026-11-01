ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS status_pembayaran text NOT NULL DEFAULT 'belum_dibayar';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_status_pembayaran_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_status_pembayaran_check
    CHECK (status_pembayaran IN ('belum_dibayar', 'sudah_dibayar'));
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
