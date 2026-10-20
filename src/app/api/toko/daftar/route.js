import {
  permintaanApi,
  responsGagal,
  URL_TOKO,
} from "@/lib/server/tokoApi";

export async function GET(request) {
  try {
    request.headers.get("cookie");
    const daftar = await permintaanApi(URL_TOKO);
    if (!Array.isArray(daftar)) {
      throw new Error("Format daftar toko dari API tidak valid.");
    }
    return Response.json(
      daftar.map(({ id, namaToko, aktif }) => ({
        id,
        namaToko,
        aktif: aktif !== false,
      })),
    );
  } catch (error) {
    return responsGagal(error);
  }
}
