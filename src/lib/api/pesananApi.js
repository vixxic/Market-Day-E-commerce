import { URL_PESANAN } from "@/lib/api/urlConfig";

async function permintaanPesanan(url, options) {
  const respons = await fetch(url, options);

  if (!respons.ok) {
    throw new Error(`Permintaan data pesanan gagal (${respons.status}).`);
  }

  if (respons.status === 204) return null;
  return respons.json();
}

export async function ambilPesananToko(idToko, { signal } = {}) {
  if (idToko === null || idToko === undefined || idToko === "") {
    throw new Error("ID toko diperlukan untuk mengambil pesanan toko.");
  }

  const url = new URL(URL_PESANAN);
  url.searchParams.set("id_toko", idToko);
  const daftar = await permintaanPesanan(url, { signal });
  if (!Array.isArray(daftar)) {
    throw new Error("Format daftar pesanan toko dari API tidak valid.");
  }
  return daftar;
}

export function buatPesanan(data) {
  return permintaanPesanan(URL_PESANAN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function ambilStatusPesanan(idPesanan) {
  const response = await fetch(
    `/api/pesanan/${encodeURIComponent(idPesanan)}`,
    { cache: "no-store" },
  );
  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? "Gagal memeriksa status pesanan.");
  }
  if (
    String(data?.idPesanan) !== String(idPesanan) ||
    typeof data.status !== "string"
  ) {
    throw new Error("Format status pesanan dari API tidak valid.");
  }
  return data;
}

export function ubahStatusPesanan(id, status) {
  return permintaanPesanan(
    `${URL_PESANAN}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
}
