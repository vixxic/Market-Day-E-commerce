// Data pembayaran yang sedang berjalan, disimpan di localStorage.
//
// {
//   idPesanan: "ORD-2026-K7M3Q",
//   kodeKlaim: "8KX-92M",
//   item: [{ idProduk, nama, harga, gambar, qris, jenis, ukuran, jumlah }],
//   qris: "https://...",   // gambar QRIS milik produk yang dibayar (bisa null)
//   total: 50000,
//   dariKeranjang: true,
//   status: "menunggu_pembayaran" | "menunggu_verifikasi",
//   namaPenerima: "",
//   dibuat: "2026-10-18T..."
// }

const KUNCI = "pembayaran-marketday";

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

export function ambilPembayaran() {
  try {
    const mentah = localStorage.getItem(KUNCI);
    return mentah ? JSON.parse(mentah) : null;
  } catch {
    return null;
  }
}

function simpan(pembayaran) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(pembayaran));
  } catch {
    // penyimpanan penuh / diblokir: abaikan
  }
  return pembayaran;
}

/**
 * Dipanggil saat pembeli menekan "Bayar". Membuat kode klaim & id pesanan baru
 * (menggantikan pembayaran sebelumnya), lalu menyimpannya.
 *
 * baris         : array { idProduk, nama, harga, gambar, jenis, ukuran, jumlah }
 * dariKeranjang : true kalau produknya berasal dari halaman keranjang
 */
export function siapkanPembayaran(baris, { dariKeranjang = false } = {}) {
  const total = baris.reduce((jumlah, b) => jumlah + b.harga * b.jumlah, 0);

  return simpan({
    idPesanan: buatIdPesanan(),
    kodeKlaim: buatKodeKlaim(),
    item: baris,
    qris: baris.find((b) => b.qris)?.qris ?? null,
    total,
    dariKeranjang,
    status: "menunggu_pembayaran",
    namaPenerima: "",
    dibuat: new Date().toISOString(),
  });
}

export function tandaiMenungguVerifikasi(namaPenerima) {
  const sekarang = ambilPembayaran();
  if (!sekarang) return null;
  return simpan({ ...sekarang, namaPenerima, status: "menunggu_verifikasi" });
}
