import { supabaseServer } from "@/lib/supabase/server";
import { ambilIpKlien, hashIp } from "@/lib/server/klien";

const JENDELA_DEDUPE_MS = 60 * 60 * 1000;
const MAKS_KUNJUNGAN_PER_IP = 120;

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (typeof id !== "string" || !id.trim()) {
      return Response.json({ error: "ID produk tidak valid." }, { status: 400 });
    }

    const { data: produk, error } = await supabaseServer
      .from("products")
      .select("id, id_toko")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!produk) {
      return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    const ip = ambilIpKlien(request);
    const terlacak = ip !== "lokal";
    const sumber = terlacak ? `detail:${hashIp(ip)}` : "detail";
    const batasWaktu = new Date(Date.now() - JENDELA_DEDUPE_MS).toISOString();

    // Satu kunjungan per produk per IP per jam, dan batas total per IP.
    // Mencegah penghitungan analitik dinaikkan dengan POST berulang.
    if (terlacak) {
      const [perProduk, perIp] = await Promise.all([
        supabaseServer
          .from("product_views")
          .select("id", { count: "exact", head: true })
          .eq("id_produk", produk.id)
          .eq("sumber", sumber)
          .gte("created_at", batasWaktu),
        supabaseServer
          .from("product_views")
          .select("id", { count: "exact", head: true })
          .eq("sumber", sumber)
          .gte("created_at", batasWaktu),
      ]);

      if (perProduk.error || perIp.error) {
        console.warn(
          "Pemeriksaan duplikat kunjungan gagal:",
          perProduk.error?.message ?? perIp.error?.message,
        );
      } else if (
        (perProduk.count ?? 0) > 0 ||
        (perIp.count ?? 0) >= MAKS_KUNJUNGAN_PER_IP
      ) {
        return Response.json({ trekaman: false, duplikat: true });
      }
    }

    const { error: simpanError } = await supabaseServer
      .from("product_views")
      .insert([
        {
          id_produk: produk.id,
          id_toko: produk.id_toko,
          sumber,
        },
      ]);

    if (simpanError) {
      // Tabel analitik belum ada: jangan ganggu pengalaman pembeli.
      console.warn(
        "Kunjungan produk tidak tercatat. Jalankan migrasi store profiles & analytics.",
        simpanError.message,
      );
      return Response.json({ trekaman: false });
    }

    return Response.json({ trekaman: true }, { status: 201 });
  } catch (error) {
    console.error("Gagal mencatat kunjungan produk:", error);
    return Response.json({ trekaman: false });
  }
}
