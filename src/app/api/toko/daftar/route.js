import { supabaseServer } from "@/lib/supabase/server";
import { responsGagal } from "@/lib/server/tokoApi";

const KOLOM_PROFIL =
  "id, nama_toko, aktif, deskripsi, foto_profil, banner, lokasi";
const KOLOM_DASAR = "id, nama_toko, aktif";

function bentukToko(toko) {
  return {
    id: toko.id,
    namaToko: toko.nama_toko,
    aktif: toko.aktif !== false,
    deskripsi: toko.deskripsi ?? "",
    fotoProfil: toko.foto_profil ?? null,
    banner: toko.banner ?? null,
    lokasi: toko.lokasi ?? "",
  };
}

export async function GET() {
  try {
    let hasil = await supabaseServer
      .from("stores")
      .select(KOLOM_PROFIL)
      .eq("aktif", true);

    // Sebelum migrasi profil dijalankan, kolom profil belum ada.
    // Tetap tampilkan daftar toko dengan profil kosong.
    if (hasil.error) {
      hasil = await supabaseServer
        .from("stores")
        .select(KOLOM_DASAR)
        .eq("aktif", true);
    }

    if (hasil.error) throw hasil.error;

    return Response.json((hasil.data ?? []).map(bentukToko));
  } catch (error) {
    return responsGagal(error);
  }
}
