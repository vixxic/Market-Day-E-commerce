export async function permintaanKelolaToko(url, options) {
  const respons = await fetch(url, options);
  const data = respons.status === 204 ? null : await respons.json();
  if (!respons.ok) {
    throw new Error(data?.error ?? "Permintaan gagal. Coba lagi.");
  }
  return data;
}

export function gambarProduk(produk) {
  const gambar = produk.image;
  if (Array.isArray(gambar)) return gambar[0] ?? "";
  return typeof gambar === "string" ? gambar : "";
}

export function formatStatusPesanan(status) {
  const label = {
    menunggu_konfirmasi: "Permintaan",
    diproses: "Diterima",
    selesai: "Selesai",
    ditolak: "Ditolak",
  };
  return label[status] ?? status;
}
