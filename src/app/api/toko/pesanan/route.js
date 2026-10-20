import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { permintaanApi, responsGagal, URL_PESANAN } from "@/lib/server/tokoApi";

export async function GET(request) {
  try {
    const toko = bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }
    const daftar = await permintaanApi(URL_PESANAN);
    if (!Array.isArray(daftar)) throw new Error("Format daftar pesanan tidak valid.");
    return Response.json(
      daftar.filter((pesanan) => String(pesanan.id_toko) === toko.id),
    );
  } catch (error) {
    return responsGagal(error);
  }
}
