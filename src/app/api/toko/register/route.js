import { daftarkanToko, setelSesiToko } from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";

export async function POST(request) {
  try {
    const { namaToko, password } = await dataJson(request);
    const nama = typeof namaToko === "string" ? namaToko.trim() : "";
    if (nama.length < 2 || nama.length > 80) {
      return Response.json(
        { error: "Nama toko harus terdiri dari 2–80 karakter." },
        { status: 400 },
      );
    }
    if (typeof password !== "string" || password.length < 6) {
      return Response.json(
        { error: "Password toko minimal 6 karakter." },
        { status: 400 },
      );
    }

    const toko = await daftarkanToko(nama, password);
    await setelSesiToko(toko);
    return Response.json({ toko }, { status: 201 });
  } catch (error) {
    return responsGagal(error);
  }
}
