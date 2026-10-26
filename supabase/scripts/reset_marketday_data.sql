-- Permanently removes all Market Day store accounts, products, orders,
-- and OTP rate-limit request records from this Supabase project.
-- Run only after confirming the selected project is the intended one.

BEGIN;

DELETE FROM public.otp_requests;
DELETE FROM public.orders;
DELETE FROM public.products;
DELETE FROM public.stores;

COMMIT;
