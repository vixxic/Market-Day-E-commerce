import { ambilJsonAman, galatRamah } from "@/lib/galatRamah";

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
  const data = await ambilJsonAman("/api/toko/daftar", {
    signal,
    cache: "no-store",
  });

  if (!Array.isArray(data)) {
    throw galatRamah();
  }

  return data.map(normalisasiToko);
}

export async function ambilTokoById(id, { signal } = {}) {
  const data = await ambilJsonAman(`/api/toko/${encodeURIComponent(id)}`, {
    signal,
    cache: "no-store",
  });

  const toko = data?.toko;
  if (!toko || !toko.id) {
    throw galatRamah();
  }

  return toko;
}
