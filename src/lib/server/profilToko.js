import { supabaseServer } from "@/lib/supabase/server";

const KOLOM_PROFIL = "deskripsi, foto_profil, banner, lokasi";

export function rapikanProfilToko(data) {
  return {
    deskripsi: data?.deskripsi ?? "",
    fotoProfil: data?.foto_profil ?? null,
    banner: data?.banner ?? null,
    lokasi: data?.lokasi ?? "",
  };
}

/**
 * Membaca kolom profil toko secara terpisah supaya aplikasi tetap berjalan
 * (dengan profil kosong) sebelum migrasi profil dijalankan.
 */
export async function ambilProfilToko(id) {
  const { data, error } = await supabaseServer
    .from("stores")
    .select(KOLOM_PROFIL)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      tersedia: false,
      profil: rapikanProfilToko(null),
      error,
    };
  }

  return {
    tersedia: true,
    profil: rapikanProfilToko(data),
    error: null,
  };
}
