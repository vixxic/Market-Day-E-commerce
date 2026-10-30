import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { unggahFoto } from "@/lib/server/fotoStorage";
import { responsGagal } from "@/lib/server/tokoApi";

export async function POST(request) {
  const toko = await bacaSesiToko(request);
  if (!toko) {
    return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Form unggah foto tidak valid." },
      { status: 400 },
    );
  }

  try {
    const url = await unggahFoto({
      file: formData.get("file"),
      folder: encodeURIComponent(String(toko.id)),
      namaDasar: "produk",
      label: "foto produk",
    });
    return Response.json({ url }, { status: 201 });
  } catch (error) {
    return responsGagal(error);
  }
}
