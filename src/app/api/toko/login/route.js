import { autentikasiToko, setelSesiToko } from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";

export async function POST(request) {
  try {
    const { namaToko, password } = await dataJson(request);
    if (
      typeof namaToko !== "string" ||
      !namaToko.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return Response.json(
        { error: "Nama toko dan password wajib diisi." },
        { status: 400 },
      );
    }
    const toko = await autentikasiToko(namaToko.trim(), password);
    await setelSesiToko(toko);
    return Response.json({ toko });
  } catch (error) {
    return responsGagal(error);
  }
}
