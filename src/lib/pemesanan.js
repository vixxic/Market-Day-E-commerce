// Data pemesanan yang sedang berjalan, disimpan di localStorage.
//
// {
//   idCheckout: "CHK-2026-K7M3Q",
//   idPesanan: "ORD-2026-K7M3Q",
//   kodeKlaim: "8KX-92M",
//   item: [{ idProduk, nama, harga, gambar, jenis, ukuran, jumlah }],
//   total: 50000,
//   dariKeranjang: true,
//   status: "draft" | "menunggu_konfirmasi",
//   namaPenerima: "",
//   nomorPemesan: "",
//   dibuat: "2026-10-18T..."
// }

import {
  getLocalStorageSnapshot,
  subscribeLocalStorage,
  writeLocalStorage,
} from "@/lib/localStorageStore";

const KUNCI = "pemesanan-marketday";
const KUNCI_DAFTAR = "pesanan-marketday";

export function getPemesananSnapshot() {
  return getLocalStorageSnapshot(KUNCI);
}

export function subscribePemesanan(listener) {
  return subscribeLocalStorage(KUNCI, listener);
}

export function getDaftarPesananSnapshot() {
  return getLocalStorageSnapshot(KUNCI_DAFTAR);
}

export function subscribeDaftarPesanan(listener) {
  return subscribeLocalStorage(KUNCI_DAFTAR, listener);
}

// Tanpa huruf/angka yang mirip (0/O, 1/I) supaya mudah dibaca dan diketik
const KARAKTER = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function acak(panjang) {
  const nilai = new Uint32Array(panjang);
  crypto.getRandomValues(nilai);
  return Array.from(nilai, (n) => KARAKTER[n % KARAKTER.length]).join("");
}

/** Contoh hasil: "8KX-92M" */
export function buatKodeKlaim() {
  return `${acak(3)}-${acak(3)}`;
}

/** Contoh hasil: "ORD-2026-K7M3Q" */
export function buatIdPesanan() {
  return `ORD-${new Date().getFullYear()}-${acak(5)}`;
}

export function buatIdCheckout() {
  return `CHK-${new Date().getFullYear()}-${acak(5)}`;
}

export function ambilPemesanan() {
  try {
    const mentah = getPemesananSnapshot();
    return mentah ? JSON.parse(mentah) : null;
  } catch (error) {
    console.error("Data pemesanan di browser tidak valid.", error);
    return null;
  }
}

function simpan(pemesanan) {
  writeLocalStorage(KUNCI, JSON.stringify(pemesanan));
  return pemesanan;
}

/**
 * Membuat kode klaim dan id pesanan baru, lalu menyimpannya.
 *
 * baris         : array { idProduk, nama, harga, gambar, jenis, ukuran, jumlah }
 * dariKeranjang : true kalau produknya berasal dari halaman keranjang
 */
export function siapkanPemesanan(baris, { dariKeranjang = false } = {}) {
  const total = baris.reduce((jumlah, b) => jumlah + b.harga * b.jumlah, 0);

  return simpan({
    idPesanan: buatIdPesanan(),
    kodeKlaim: buatKodeKlaim(),
    item: baris,
    total,
    dariKeranjang,
    status: "draft",
    namaPenerima: "",
    nomorPemesan: "",
    dibuat: new Date().toISOString(),
  });
}

// ----- daftar semua pesanan (untuk halaman Profil Pesanan) -----

/** Semua pesanan yang sudah diselesaikan pembeli, yang terbaru di paling atas. */
export function ambilDaftarPesanan() {
  try {
    const mentah = getDaftarPesananSnapshot();
    const data = mentah ? JSON.parse(mentah) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Data daftar pesanan di browser tidak valid.", error);
    return [];
  }
}

export function tandaiMenungguKonfirmasi(namaPenerima, nomorPemesan) {
  const sekarang = ambilPemesanan();
  if (!sekarang) return null;

  const diperbarui = simpan({
    ...sekarang,
    namaPenerima,
    nomorPemesan,
    status: "menunggu_konfirmasi",
  });

  return diperbarui;
}

export function simpanPemesanan(pemesanan) {
  return simpan(pemesanan);
}
