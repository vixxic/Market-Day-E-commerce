import {
  autentikasiToko,
  setelSesiToko,
  tokoPublik,
  cekBatasLogin,
  catatLoginGagal,
  bersihkanLoginGagal,
} from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import { ambilIpKlien } from "@/lib/server/klien";

export async function POST(request) {
  try {
    const { namaToko, password } = await dataJson(request);
    if (
      typeof namaToko !== "string" ||
      namaToko.trim().length < 2 ||
      namaToko.trim().length > 80 ||
      typeof password !== "string" ||
      !password ||
      password.length > 200
    ) {
      return Response.json(
        { error: "Nama toko dan password wajib diisi." },
        { status: 400 },
      );
    }

    const nama = namaToko.trim();
    const ip = ambilIpKlien(request);
    const batas = cekBatasLogin(ip, nama);

    if (!batas.boleh) {
      return Response.json(
        {
          error:
            "Terlalu banyak percobaan login. Coba lagi setelah beberapa menit.",
          retryAfter: batas.tungguDetik,
        },
        {
          status: 429,
          headers: { "Retry-After": String(batas.tungguDetik || 60) },
        },
      );
    }

    try {
      const toko = await autentikasiToko(nama, password);
      bersihkanLoginGagal(ip, nama);
      await setelSesiToko(toko);
      return Response.json({ toko: tokoPublik(toko) });
    } catch (error) {
      if (error.status === 401) {
        catatLoginGagal(ip, nama);
        return Response.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }
  } catch (error) {
    return responsGagal(error);
  }
}
