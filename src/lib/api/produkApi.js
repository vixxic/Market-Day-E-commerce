import { URL_PRODUK } from "@/lib/api/urlConfig";

async function permintaanProduk(url, options) {
  const respons = await fetch(url, options);

  if (!respons.ok) {
    const error = new Error(`Permintaan produk gagal (${respons.status}).`);
    error.status = respons.status;
    throw error;
  }

  if (respons.status === 204) return null;
  return respons.json();
}

export async function ambilDaftarProduk({ signal } = {}) {
  const produk = await permintaanProduk(URL_PRODUK, { signal });
  if (!Array.isArray(produk)) {
    throw new Error("Format daftar produk dari API tidak valid.");
  }
  return produk;
}

export async function ambilProdukById(id, { signal } = {}) {
  try {
    return await permintaanProduk(`${URL_PRODUK}/${encodeURIComponent(id)}`, {
      signal,
    });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export function tambahProduk(data) {
  return permintaanProduk(URL_PRODUK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function ubahProduk(id, data) {
  return permintaanProduk(`${URL_PRODUK}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function hapusProduk(id) {
  await permintaanProduk(`${URL_PRODUK}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
