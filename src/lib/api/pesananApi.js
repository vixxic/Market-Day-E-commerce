const URL_PESANAN =
  "https://6ad62c7ef71f154ac48697fd.mockapi.io/pesananmarketday";

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
