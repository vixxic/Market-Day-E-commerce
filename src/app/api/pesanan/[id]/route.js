import { permintaanApi, URL_PESANAN } from "@/lib/server/tokoApi";

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "ID pesanan diperlukan." }, { status: 400 });
  }

  try {
    const url = new URL(URL_PESANAN);
    url.searchParams.set("idPesanan", id);
    const daftar = await permintaanApi(url.toString());
    const pesanan = Array.isArray(daftar)
      ? daftar.find(
          (item) => String(item.idPesanan ?? item.id) === String(id),
        )
      : null;

    if (!pesanan) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    return Response.json({
      idPesanan: pesanan.idPesanan ?? pesanan.id,
      status: pesanan.status,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Gagal memeriksa status pesanan." },
      { status: 502 },
    );
  }
}
