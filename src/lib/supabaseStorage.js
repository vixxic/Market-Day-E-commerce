import { ambilJsonAman, galatRamah } from "@/lib/galatRamah";

async function unggahFoto(urlEndpoint, file, fieldTambahan = {}) {
  const formData = new FormData();
  formData.append("file", file);
  for (const [nama, nilai] of Object.entries(fieldTambahan)) {
    formData.append(nama, nilai);
  }

  const data = await ambilJsonAman(urlEndpoint, {
    method: "POST",
    body: formData,
  });

  if (typeof data?.url !== "string" || !data.url) {
    throw galatRamah();
  }

  return data.url;
}

export async function unggahFotoProduk(file) {
  return unggahFoto("/api/toko/produk/foto", file);
}

/**
 * jenis: "avatar" untuk foto profil, "banner" untuk banner toko.
 */
export async function unggahFotoProfil(file, jenis = "avatar") {
  return unggahFoto("/api/toko/profil/foto", file, { jenis });
}
