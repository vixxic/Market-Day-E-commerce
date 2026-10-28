function normalisasiToko(toko) {
  return {
    id: toko.id,
    namaToko: toko.namaToko,
    aktif: toko.aktif,
    deskripsi: toko.deskripsi ?? "",
    fotoProfil: toko.fotoProfil ?? null,
    banner: toko.banner ?? null,
    lokasi: toko.lokasi ?? "",
  };
}

export async function ambilDaftarToko({ signal } = {}) {
  const respons = await fetch("/api/toko/daftar", {
    signal,
    cache: "no-store",
  });
  const data = await respons.json().catch(() => null);

  if (!respons.ok) {
    throw new Error(data?.error ?? "Permintaan data toko gagal.");
  }

  if (!Array.isArray(data)) {
    throw new Error("Format daftar toko dari API tidak valid.");
  }

  return data.map(normalisasiToko);
}

export async function ambilTokoById(id, { signal } = {}) {
  const respons = await fetch(`/api/toko/${encodeURIComponent(id)}`, {
    signal,
    cache: "no-store",
  });
  const data = await respons.json().catch(() => null);

  if (!respons.ok) {
    const error = new Error(data?.error ?? "Toko gagal dimuat.");
    error.status = respons.status;
    throw error;
  }

  const toko = data?.toko;
  if (!toko || !toko.id) {
    throw new Error("Format data toko dari server tidak valid.");
  }

  return toko;
}
