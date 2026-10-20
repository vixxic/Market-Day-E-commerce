export async function unggahFotoProduk(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/toko/produk/foto", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Gagal mengunggah foto produk.");
  }
  if (typeof data.url !== "string" || !data.url) {
    throw new Error("Supabase tidak mengembalikan URL foto yang valid.");
  }

  return data.url;
}
