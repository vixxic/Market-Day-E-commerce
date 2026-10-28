import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { unggahFoto } from "@/lib/server/fotoStorage";

const JENIS_FOTO = new Set(["avatar", "banner"]);

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

  const jenis = String(formData.get("jenis") ?? "avatar");
  if (!JENIS_FOTO.has(jenis)) {
    return Response.json({ error: "Jenis foto tidak valid." }, { status: 400 });
  }

  try {
    const url = await unggahFoto({
      file: formData.get("file"),
      folder: `${encodeURIComponent(String(toko.id))}/profil`,
      namaDasar: jenis,
      label: jenis === "banner" ? "banner toko" : "foto profil toko",
    });
    return Response.json({ url }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: error.status ?? 500 },
    );
  }
}
