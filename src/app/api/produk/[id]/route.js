import { supabaseServer } from "@/lib/supabase/server";
import { responsGagal } from "@/lib/server/tokoApi";
import { POLA_UUID } from "@/lib/server/validasiInput";

const KOLOM_PRODUK =
  "id, nama, harga, stok, gambar, gambar_list, id_toko, created_at, updated_at, deskripsi, kategori, rasa, ukuran";

export async function GET(_request, { params }) {
  const { id } = await params;

  if (typeof id !== "string" || !POLA_UUID.test(id)) {
    return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("products")
      .select(KOLOM_PRODUK)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    return Response.json(data);
  } catch (error) {
    return responsGagal(error);
  }
}
