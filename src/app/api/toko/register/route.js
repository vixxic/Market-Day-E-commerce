import {
  daftarkanToko,
  setelSesiToko,
  tokoPublik,
} from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import { ambilIpKlien } from "@/lib/server/klien";
import { tambahHit } from "@/lib/server/rateLimitMemori";

export async function POST(request) {
  try {
    const ip = ambilIpKlien(request);
    const batas = tambahHit(`register:${ip}`, 5, 60 * 60 * 1000);

    if (!batas.boleh) {
      return Response.json(
        { error: "Terlalu banyak pendaftaran toko. Coba lagi nanti." },
        { status: 429 },
      );
    }

    const { namaToko, password, whatsappNumber } = await dataJson(request);
    const nama = typeof namaToko === "string" ? namaToko.trim() : "";
    if (nama.length < 2 || nama.length > 80) {
      return Response.json(
        { error: "Nama toko harus terdiri dari 2–80 karakter." },
        { status: 400 },
      );
    }
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 200
    ) {
      return Response.json(
        { error: "Password toko harus terdiri dari 8–200 karakter." },
        { status: 400 },
      );
    }

    const toko = await daftarkanToko(nama, password, whatsappNumber);
    await setelSesiToko(toko);
    return Response.json({ toko: tokoPublik(toko) }, { status: 201 });
  } catch (error) {
    return responsGagal(error);
  }
}
