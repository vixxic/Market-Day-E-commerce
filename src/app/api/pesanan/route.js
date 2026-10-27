import { supabaseServer } from "@/lib/supabase/server";
import { dataJson } from "@/lib/server/tokoApi";

export async function POST(request) {
  try {
    const body = await dataJson(request);

    const { data: toko, error: tokoError } = await supabaseServer
      .from("stores")
      .select("id")
      .eq("id", body.id_toko)
      .maybeSingle();

    if (tokoError) throw tokoError;
    if (!toko) {
      return Response.json(
        {
          error:
            "Toko untuk produk di keranjang sudah tidak tersedia. Kembali ke keranjang dan pilih produk yang masih tersedia.",
        },
        { status: 409 },
      );
    }

    const { data, error } = await supabaseServer
      .from("orders")
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error("Gagal membuat pesanan:", error);
    return Response.json(
      { error: "Pesanan belum berhasil dibuat. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
