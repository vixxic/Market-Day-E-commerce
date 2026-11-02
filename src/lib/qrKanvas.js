// Menggambar QR Code ke canvas 2D. Dipakai gambar detail pesanan supaya
// pemilik toko bisa memindai dan langsung membuka pesanan di situs.
//
// qrcode-generator sudah menangani pemilihan versi, koreksi galat, dan
// masking, jadi di sini kita hanya perlu menerjemahkan matriksnya jadi kotak.

import qrcode from "qrcode-generator";

const KOREKSI_GALAT = "M";

/** Matriks QR (array baris berisi boolean) untuk teks yang diberikan. */
export function matriksQr(teks) {
  const isi = String(teks ?? "").trim();
  if (!isi) throw new Error("Teks QR kosong.");

  const qr = qrcode(0, KOREKSI_GALAT);
  qr.addData(isi);
  qr.make();

  const jumlah = qr.getModuleCount();
  const matriks = [];

  for (let baris = 0; baris < jumlah; baris += 1) {
    const barisModul = [];
    for (let kolom = 0; kolom < jumlah; kolom += 1) {
      barisModul.push(qr.isDark(baris, kolom));
    }
    matriks.push(barisModul);
  }

  return matriks;
}

/**
 * Menggambar QR pada ctx. `ukuran` adalah sisi kotak (sudah termasuk quiet
 * zone / tepi kosong yang wajib ada agar mudah dipindai).
 */
export function gambarQr(
  ctx,
  teks,
  {
    x,
    y,
    ukuran,
    tepi = 4,
    warna = "#000000",
    latar = "#ffffff",
  } = {},
) {
  const matriks = matriksQr(teks);
  const jumlah = matriks.length + tepi * 2;
  const sisi = ukuran / jumlah;

  ctx.save();

  if (latar) {
    ctx.fillStyle = latar;
    ctx.fillRect(x, y, ukuran, ukuran);
  }

  ctx.fillStyle = warna;

  for (let baris = 0; baris < matriks.length; baris += 1) {
    for (let kolom = 0; kolom < matriks[baris].length; kolom += 1) {
      if (!matriks[baris][kolom]) continue;
      // Sedikit lebih besar supaya tidak ada celah subpiksel antar modul.
      ctx.fillRect(
        x + (kolom + tepi) * sisi,
        y + (baris + tepi) * sisi,
        sisi + 0.5,
        sisi + 0.5,
      );
    }
  }

  ctx.restore();
  return ukuran;
}
