import { supabaseServer } from "@/lib/supabase/server";
import { responsGagal } from "@/lib/server/tokoApi";

// Bintang dipakai supaya kolom baru (mis. promo) tetap ikut terkirim tanpa
// membuat query gagal saat migration-nya belum diterapkan.
const KOLOM_PRODUK = "*";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("products")
      .select(KOLOM_PRODUK)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json(data ?? []);
  } catch (error) {
    return responsGagal(error);
  }
}
