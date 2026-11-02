/**
 * PostgREST memakai dua kode berbeda saat kolom belum ada di database:
 * - "42703"   : kolom tidak ditemukan (select/filter)
 * - "PGRST204": kolom tidak ditemukan di schema cache (insert/update)
 *
 * Dipakai supaya fitur baru (mis. products.promo) tidak mematikan alur lama
 * sebelum migration-nya diterapkan di Supabase.
 */
export function kolomBelumAda(error) {
  return ["42703", "PGRST204"].includes(error?.code);
}
