import { bacaSesiToko } from "@/lib/server/tokoAuth";
import {
  dataJson,
  permintaanApi,
  responsGagal,
  URL_PRODUK,
} from "@/lib/server/tokoApi";

export async function GET(request) {
  try {
    const toko = bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }
    const daftar = await permintaanApi(URL_PRODUK);
    if (!Array.isArray(daftar)) throw new Error("Format daftar produk tidak valid.");
    return Response.json(
      daftar.filter((produk) => String(produk.id_penjual) === toko.id),
    );
  } catch (error) {
    return responsGagal(error);
  }
}

export async function POST(request) {
  try {
    const toko = bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const data = await dataJson(request);
    const nama = typeof data.nama === "string" ? data.nama.trim() : "";
    const kategori = Array.isArray(data.kategori)
      ? [...new Set(
          data.kategori
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean),
        )]
      : typeof data.kategori === "string" && data.kategori.trim()
        ? [data.kategori.trim()]
        : [];
    const harga = Number(data.harga);
    const image = data.image;
    if (!nama || kategori.length === 0 || !Number.isFinite(harga) || harga <= 0) {
      return Response.json(
        { error: "Nama, harga yang valid, dan kategori wajib diisi." },
        { status: 400 },
      );
    }
    if (
      !(typeof image === "string" && image.trim()) &&
      !(Array.isArray(image) && image.some((url) => typeof url === "string" && url.trim()))
    ) {
      return Response.json({ error: "Foto produk wajib diisi." }, { status: 400 });
    }

    const produkBaru = {
      nama,
      deskripsi: typeof data.deskripsi === "string" ? data.deskripsi.trim() : "",
      harga,
      kategori,
      image,
      ...(Array.isArray(data.rasa) && data.rasa.length > 0
        ? { rasa: data.rasa }
        : {}),
      ...(Array.isArray(data.ukuran) && data.ukuran.length > 0
        ? { ukuran: data.ukuran }
        : {}),
      aktif: true,
      id_penjual: toko.id,
    };
    const produk = await permintaanApi(URL_PRODUK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(produkBaru),
    });
    return Response.json(produk, { status: 201 });
  } catch (error) {
    return responsGagal(error);
  }
}
