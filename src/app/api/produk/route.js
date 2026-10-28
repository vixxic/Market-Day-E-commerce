import { supabaseServer } from "@/lib/supabase/server";
import { responsGagal } from "@/lib/server/tokoApi";

const KOLOM_PRODUK =
  "id, nama, harga, gambar, gambar_list, id_toko, created_at, updated_at, deskripsi, kategori, rasa, ukuran";

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
