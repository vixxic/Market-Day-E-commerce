function normalisasiProduk(produk) {
  const sumberGambar =
    Array.isArray(produk.gambar_list) && produk.gambar_list.length > 0
      ? produk.gambar_list
      : produk.image ?? produk.gambar;
  const gambarList = (
    Array.isArray(sumberGambar)
      ? sumberGambar
      : typeof sumberGambar === "string"
        ? [sumberGambar]
        : []
  ).filter((gambar) => typeof gambar === "string" && gambar.trim());

  return {
    ...produk,
    gambar: gambarList[0] ?? null,
    image: gambarList,
  };
}

import { ambilJsonAman, galatRamah } from "@/lib/galatRamah";

async function ambilJson(url, { signal } = {}) {
  return ambilJsonAman(url, { signal, cache: "no-store" });
}

export async function ambilDaftarProduk({ signal } = {}) {
  const produk = await ambilJson("/api/produk", { signal });
  if (!Array.isArray(produk)) {
    throw galatRamah();
  }

  return produk.map(normalisasiProduk);
}

export async function ambilProdukById(id, { signal } = {}) {
  try {
    const produk = await ambilJson(
      `/api/produk/${encodeURIComponent(id)}`,
      { signal },
    );
    if (!produk) return null;

    return normalisasiProduk(produk);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}
