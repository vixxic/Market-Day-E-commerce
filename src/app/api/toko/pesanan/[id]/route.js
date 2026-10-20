import { bacaSesiToko } from "@/lib/server/tokoAuth";
import {
  dataJson,
  permintaanApi,
  responsGagal,
  URL_PESANAN,
} from "@/lib/server/tokoApi";

export async function PATCH(request, { params }) {
  try {
    const toko = bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const { id } = await params;
    const daftarToko = await permintaanApi(
      `${URL_PESANAN}?id_toko=${encodeURIComponent(toko.id)}`,
    );
    const pesanan = Array.isArray(daftarToko)
      ? daftarToko.find((item) => String(item.id) === String(id))
      : null;
    if (!pesanan || String(pesanan.id_toko) !== toko.id) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const { status } = await dataJson(request);
    if (
      status !== "diproses" ||
      pesanan.status !== "menunggu_konfirmasi"
    ) {
      return Response.json(
        { error: "Status pesanan tidak dapat diubah ke status tersebut." },
        { status: 400 },
      );
    }

    const diperbarui = await permintaanApi(
      `${URL_PESANAN}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    return Response.json(diperbarui);
  } catch (error) {
    return responsGagal(error);
  }
}
