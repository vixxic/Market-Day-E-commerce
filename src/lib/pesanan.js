import {
  ambilDaftarPesanan,
} from "@/lib/pemesanan";
import {
  subscribeLocalStorage,
  writeLocalStorage,
} from "@/lib/localStorageStore";

const KUNCI_DAFTAR = "pesanan-marketday";
const STATUS_PESANAN = [
  "menunggu_otp",
  "menunggu_konfirmasi",
  "diproses",
  "selesai",
  "terverifikasi",
  "ditolak",
  "dibatalkan",
];

export function subscribePesanan(listener) {
  return subscribeLocalStorage(KUNCI_DAFTAR, listener);
}

export function buatPesanan(data) {
  const pesanan = {
    ...data,
    status: data.status ?? "menunggu_konfirmasi",
    dibuat: data.dibuat ?? new Date().toISOString(),
  };
  return simpanPesananLokal(pesanan);
}

export function simpanPesananLokal(pesanan) {
  const daftar = ambilDaftarPesanan().filter(
    (item) => item.idPesanan !== pesanan.idPesanan,
  );
  writeLocalStorage(KUNCI_DAFTAR, JSON.stringify([pesanan, ...daftar]));
  return pesanan;
}

export function ambilPesananById(id) {
  return ambilDaftarPesanan().find(
    (pesanan) => String(pesanan.idPesanan) === String(id),
  ) ?? null;
}

export function ubahStatusPesanan(id, status) {
  if (!STATUS_PESANAN.includes(status)) {
    throw new Error(`Status pesanan tidak valid: ${status}`);
  }

  const daftar = ambilDaftarPesanan();
  let ditemukan = false;
  const diperbarui = daftar.map((pesanan) => {
    if (String(pesanan.idPesanan) !== String(id)) return pesanan;
    ditemukan = true;
    return { ...pesanan, status };
  });

  if (!ditemukan) throw new Error(`Pesanan "${id}" tidak ditemukan.`);
  writeLocalStorage(KUNCI_DAFTAR, JSON.stringify(diperbarui));
  return diperbarui.find(
    (pesanan) => String(pesanan.idPesanan) === String(id),
  );
}

export function hapusPesanan(id) {
  const daftar = ambilDaftarPesanan();
  writeLocalStorage(
    KUNCI_DAFTAR,
    JSON.stringify(
      daftar.filter((pesanan) => String(pesanan.idPesanan) !== String(id)),
    ),
  );
}

export function parseDaftarPesananSnapshot(snapshot) {
  if (!snapshot) return [];
  try {
    const daftar = JSON.parse(snapshot);
    return Array.isArray(daftar) ? daftar : [];
  } catch (error) {
    console.error("Data daftar pesanan di browser tidak valid.", error);
    return [];
  }
}
