async function permintaanToko(options) {
  const respons = await fetch("/api/toko/daftar", options);

  if (!respons.ok) {
    throw new Error(`Permintaan data toko gagal (${respons.status}).`);
  }

  const data = await respons.json();
  if (!Array.isArray(data)) {
    throw new Error("Format daftar toko dari API tidak valid.");
  }

  return data.map(({ id, namaToko, aktif }) => ({ id, namaToko, aktif }));
}

export async function ambilDaftarToko({ signal } = {}) {
  return permintaanToko({ signal });
}
