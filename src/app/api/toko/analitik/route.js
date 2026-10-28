import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { supabaseServer } from "@/lib/supabase/server";
import { hitungAnalitik } from "@/lib/analitikToko";
import { responsGagal } from "@/lib/server/tokoApi";

const HARI_KUNJUNGAN = 30;

export async function GET(request) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const batasKunjungan = new Date();
    batasKunjungan.setUTCDate(batasKunjungan.getUTCDate() - HARI_KUNJUNGAN);
    batasKunjungan.setUTCHours(0, 0, 0, 0);

    const [produkResult, pesananResult, kunjunganResult] = await Promise.all([
      supabaseServer
        .from("products")
        .select("id, nama, harga, gambar, gambar_list, id_toko")
        .eq("id_toko", toko.id),
      supabaseServer
        .from("orders")
        .select("id, total, status, created_at, items")
        .eq("id_toko", toko.id)
        .neq("status", "menunggu_otp")
        .order("created_at", { ascending: false }),
      supabaseServer
        .from("product_views")
        .select("id_produk, created_at")
        .eq("id_toko", toko.id)
        .gte("created_at", batasKunjungan.toISOString()),
    ]);

    if (produkResult.error) throw produkResult.error;
    if (pesananResult.error) throw pesananResult.error;

    const viewsTersedia = !kunjunganResult.error;
    if (kunjunganResult.error) {
      console.warn(
        "Analitik kunjungan belum tersedia. Jalankan migrasi store profiles & analytics.",
        kunjunganResult.error.message,
      );
    }

    return Response.json(
      hitungAnalitik({
        orders: pesananResult.data ?? [],
        products: produkResult.data ?? [],
        views: kunjunganResult.data ?? [],
        viewsTersedia,
      }),
    );
  } catch (error) {
    return responsGagal(error);
  }
}
