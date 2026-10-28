async function unggahFoto(urlEndpoint, file, fieldTambahan = {}) {
  const formData = new FormData();
  formData.append("file", file);
  for (const [nama, nilai] of Object.entries(fieldTambahan)) {
    formData.append(nama, nilai);
  }

  const response = await fetch(urlEndpoint, {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? "Gagal mengunggah foto.");
  }
  if (typeof data?.url !== "string" || !data.url) {
    throw new Error("Supabase tidak mengembalikan URL foto yang valid.");
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
