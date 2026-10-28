import { supabaseServer } from "@/lib/supabase/server";
import { ambilProfilToko } from "@/lib/server/profilToko";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (typeof id !== "string" || !id.trim()) {
      return Response.json({ error: "ID toko tidak valid." }, { status: 400 });
    }

    const { data: toko, error } = await supabaseServer
      .from("stores")
      .select("id, nama_toko, aktif, whatsapp_number, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!toko || toko.aktif === false) {
      return Response.json(
        { error: "Toko tidak ditemukan atau sudah tidak aktif." },
        { status: 404 },
      );
    }

    const { profil } = await ambilProfilToko(id);

    const { count } = await supabaseServer
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("id_toko", id);

    return Response.json({
      toko: {
        id: String(toko.id),
        namaToko: toko.nama_toko,
        whatsappNumber: toko.whatsapp_number ?? null,
        createdAt: toko.created_at ?? null,
        jumlahProduk: count ?? 0,
        ...profil,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil profil toko publik:", error);
    return Response.json(
      { error: "Toko gagal dimuat. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
