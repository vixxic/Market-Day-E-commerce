// Membuat gambar detail pesanan (PNG) langsung di browser memakai Canvas,
// tanpa menambah dependensi. Dipakai setelah pesanan lolos verifikasi OTP,
// supaya pembeli punya bukti pesanan yang bisa disimpan atau dibagikan.

import { formatHarga } from "@/lib/formatHarga";

const LEBAR = 820;
const SKALA = 2;
const PAD = 44;
const TINGGI_HEADER = 128;

const WARNA = {
  maroon: "#832828",
  maroonGelap: "#521014",
  merah: "#c04040",
  latar: "#fff6f5",
  garis: "#f0cfcc",
  garisTipis: "#f2e4e3",
  teks: "#3f2a2a",
  redup: "#8a7472",
  redupMuda: "#a89a99",
};

const FONT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const LABEL_STATUS = {
  menunggu_otp: "Menunggu Verifikasi OTP",
  menunggu_konfirmasi: "Menunggu Konfirmasi",
  diproses: "Sudah diterima",
  selesai: "Selesai",
  terverifikasi: "Terverifikasi",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
};

function font(berat, ukuran) {
  return `${berat} ${ukuran}px ${FONT}`;
}

function angka(nilai) {
  const hasil = Number(nilai);
  return Number.isFinite(hasil) ? hasil : 0;
}

function formatTanggal(nilai) {
  if (!nilai) return "-";
  const waktu = new Date(nilai);
  if (Number.isNaN(waktu.getTime())) return "-";
  return waktu.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- bantu menggambar ---------- */

function tulis(ctx, teks, x, y, { huruf, warna, rata = "left" } = {}) {
  ctx.font = huruf;
  ctx.fillStyle = warna;
  ctx.textAlign = rata;
  ctx.fillText(String(teks ?? ""), x, y);
  ctx.textAlign = "left";
}

/** Teks dengan jarak antar huruf (canvas tidak punya letter-spacing). */
function tulisSpasi(ctx, teks, x, y, { huruf, warna, spasi, rata = "left" } = {}) {
  ctx.font = huruf;
  ctx.fillStyle = warna;

  const hurufTeks = [...String(teks ?? "")];
  const lebar =
    hurufTeks.reduce((total, c) => total + ctx.measureText(c).width, 0) +
    spasi * Math.max(0, hurufTeks.length - 1);

  let kursor = rata === "right" ? x - lebar : rata === "center" ? x - lebar / 2 : x;

  for (const c of hurufTeks) {
    ctx.fillText(c, kursor, y);
    kursor += ctx.measureText(c).width + spasi;
  }

  return lebar;
}

function kotakBulat(ctx, x, y, lebar, tinggi, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, lebar, tinggi, radius);
}

function garis(ctx, dariX, keX, y, warna, putus = false) {
  ctx.save();
  ctx.strokeStyle = warna;
  ctx.lineWidth = 1;
  if (putus) ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(dariX, y + 0.5);
  ctx.lineTo(keX, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

/* ---------- pemotongan teks ---------- */

function pecahKata(ctx, kata, maks) {
  const potong = [];
  let sisa = kata;

  while (ctx.measureText(sisa).width > maks && sisa.length > 1) {
    let n = sisa.length - 1;
    while (n > 1 && ctx.measureText(sisa.slice(0, n)).width > maks) n -= 1;
    potong.push(sisa.slice(0, n));
    sisa = sisa.slice(n);
  }

  potong.push(sisa);
  return potong;
}

function potongTeks(ctx, teks, maks) {
  const kata = String(teks ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((k) => pecahKata(ctx, k, maks));

  if (kata.length === 0) return ["-"];

  const baris = [];
  let sekarang = kata[0];

  for (let i = 1; i < kata.length; i += 1) {
    const coba = `${sekarang} ${kata[i]}`;
    if (ctx.measureText(coba).width <= maks) sekarang = coba;
    else {
      baris.push(sekarang);
      sekarang = kata[i];
    }
  }

  baris.push(sekarang);
  return baris;
}

function potongSatuBaris(ctx, teks, maks) {
  const nilai = String(teks ?? "-");
  if (ctx.measureText(nilai).width <= maks) return nilai;

  let potong = nilai;
  while (potong.length > 1 && ctx.measureText(`${potong}…`).width > maks) {
    potong = potong.slice(0, -1);
  }
  return `${potong}…`;
}

/* ---------- isi gambar ---------- */

function susunIsi(pesanan, ctx) {
  const maksNama = LEBAR - PAD * 2 - 210;

  ctx.font = font(700, 17);
  const produk = (Array.isArray(pesanan.item) ? pesanan.item : []).map(
    (baris) => {
      const nama = potongTeks(ctx, baris.nama, maksNama);
      const varian = [baris.jenis, baris.ukuran]
        .map((nilai) => (nilai == null ? "" : String(nilai).trim()))
        .filter(Boolean)
        .join(" · ");
      const jumlah = Math.max(1, Math.round(angka(baris.jumlah) || 1));
      const harga = angka(baris.harga);

      return {
        nama,
        varian,
        jumlah,
        harga,
        subtotal: harga * jumlah,
        tinggi: nama.length * 23 + (varian ? 20 : 0) + 20,
      };
    },
  );

  const totalProduk = produk.reduce((total, item) => total + item.subtotal, 0);
  const total = angka(pesanan.total) || totalProduk;

  ctx.font = font(500, 13);
  const catatan = potongTeks(
    ctx,
    "Tunjukkan gambar ini kepada penjual saat mengambil pesanan.",
    LEBAR - PAD * 2 - 40,
  );

  return { produk, total, catatan };
}

function tinggiGambar(isi) {
  let tinggi = TINGGI_HEADER + 32; // header + jarak awal

  tinggi += 112 + 28; // kartu kode klaim + jarak
  tinggi += 4 * 44 + 30; // empat baris info + jarak
  tinggi += 24 + 10; // judul bagian + jarak

  for (const item of isi.produk) tinggi += item.tinggi;

  tinggi += 22 + 46 + 26; // garis putus, total, jarak footer
  tinggi += isi.catatan.length * 20; // catatan
  tinggi += 22 + 18 + 36; // merek + waktu unduh + padding bawah

  return Math.ceil(tinggi);
}

function gambarIsi(ctx, pesanan, isi) {
  const kanan = LEBAR - PAD;
  const tengah = LEBAR / 2;

  /* --- header --- */
  ctx.fillStyle = WARNA.maroon;
  ctx.fillRect(0, 0, LEBAR, TINGGI_HEADER);

  tulis(ctx, "Market Day", PAD, 66, {
    huruf: font(800, 30),
    warna: "#ffffff",
  });
  tulis(ctx, "Sekolah Tri Ratna Jakarta", PAD, 92, {
    huruf: font(500, 14),
    warna: "rgba(255, 255, 255, 0.78)",
  });

  const labelStatus =
    LABEL_STATUS[pesanan.status] ?? LABEL_STATUS.menunggu_konfirmasi;

  tulisSpasi(ctx, "DETAIL PESANAN", kanan, 52, {
    huruf: font(700, 11),
    warna: "rgba(255, 255, 255, 0.7)",
    spasi: 1.8,
    rata: "right",
  });

  ctx.font = font(600, 13);
  const lebarPil = ctx.measureText(labelStatus).width + 32;
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
  ctx.lineWidth = 1;
  kotakBulat(ctx, kanan - lebarPil, 62, lebarPil, 30, 15);
  ctx.fill();
  ctx.stroke();
  tulis(ctx, labelStatus, kanan - lebarPil / 2, 82, {
    huruf: font(600, 13),
    warna: "#ffffff",
    rata: "center",
  });

  let y = TINGGI_HEADER + 32;

  /* --- kartu kode klaim --- */
  ctx.fillStyle = WARNA.latar;
  ctx.strokeStyle = WARNA.garis;
  ctx.lineWidth = 1;
  kotakBulat(ctx, PAD, y, LEBAR - PAD * 2, 112, 18);
  ctx.fill();
  ctx.stroke();

  tulisSpasi(ctx, "KODE KLAIM", tengah, y + 40, {
    huruf: font(700, 11),
    warna: WARNA.maroon,
    spasi: 2.2,
    rata: "center",
  });
  tulisSpasi(ctx, pesanan.kodeKlaim ?? "-", tengah, y + 86, {
    huruf: font(800, 38),
    warna: WARNA.maroonGelap,
    spasi: 4,
    rata: "center",
  });

  y += 112 + 28;

  /* --- baris info --- */
  const info = [
    ["ID Pesanan", pesanan.idPesanan ?? pesanan.id_pesanan ?? pesanan.id ?? "-"],
    [
      "Nama Pemesan",
      pesanan.namaPenerima ||
        pesanan.namaPemesan ||
        pesanan.nama_penerima ||
        "-",
    ],
    ["Nomor Pemesan", pesanan.nomorPemesan || pesanan.nomor_pemesan || "-"],
    [
      "Tanggal",
      formatTanggal(pesanan.createdAt ?? pesanan.created_at ?? pesanan.dibuat),
    ],
  ];

  ctx.font = font(700, 14.5);
  const maksNilai = LEBAR - PAD * 2 - 150;

  info.forEach(([label, nilai], urutan) => {
    tulis(ctx, label, PAD + 2, y + 28, {
      huruf: font(600, 13),
      warna: WARNA.redup,
    });
    tulis(ctx, potongSatuBaris(ctx, nilai, maksNilai), kanan - 2, y + 28, {
      huruf: font(700, 14.5),
      warna: WARNA.teks,
      rata: "right",
    });

    if (urutan < info.length - 1) {
      garis(ctx, PAD + 2, kanan - 2, y + 44, WARNA.garisTipis);
    }

    y += 44;
  });

  y += 30;

  /* --- judul bagian produk --- */
  tulisSpasi(ctx, "PRODUK DIPESAN", PAD, y + 14, {
    huruf: font(700, 11),
    warna: WARNA.maroon,
    spasi: 1.6,
  });

  y += 24 + 10;

  /* --- daftar produk --- */
  for (const item of isi.produk) {
    tulis(ctx, `${item.jumlah} × ${formatHarga(item.harga)}`, kanan - 2, y + 14, {
      huruf: font(500, 12.5),
      warna: WARNA.redup,
      rata: "right",
    });
    tulis(ctx, formatHarga(item.subtotal), kanan - 2, y + 38, {
      huruf: font(700, 16),
      warna: WARNA.maroon,
      rata: "right",
    });

    let barisY = y + 17;
    for (const baris of item.nama) {
      tulis(ctx, baris, PAD, barisY, {
        huruf: font(700, 17),
        warna: WARNA.maroonGelap,
      });
      barisY += 23;
    }

    if (item.varian) {
      tulis(ctx, item.varian, PAD, barisY + 1, {
        huruf: font(500, 12.5),
        warna: WARNA.redup,
      });
    }

    y += item.tinggi;
    garis(ctx, PAD, kanan, y, WARNA.garisTipis);
  }

  /* --- total --- */
  y += 22;
  garis(ctx, PAD, kanan, y, WARNA.garis, true);

  tulisSpasi(ctx, "TOTAL PESANAN", PAD, y + 34, {
    huruf: font(700, 11),
    warna: WARNA.redup,
    spasi: 1.6,
  });
  tulis(ctx, formatHarga(isi.total), kanan, y + 34, {
    huruf: font(800, 28),
    warna: WARNA.maroon,
    rata: "right",
  });

  y += 46 + 26;

  /* --- footer --- */
  garis(ctx, PAD, kanan, y, WARNA.garisTipis);
  y += 26;

  for (const baris of isi.catatan) {
    tulis(ctx, baris, tengah, y, {
      huruf: font(500, 13),
      warna: WARNA.redup,
      rata: "center",
    });
    y += 20;
  }

  y += 22;
  tulis(ctx, "Market Day · Sekolah Tri Ratna Jakarta", tengah, y, {
    huruf: font(700, 12.5),
    warna: WARNA.maroonGelap,
    rata: "center",
  });

  y += 18;
  tulis(ctx, `Diunduh ${formatTanggal(new Date())}`, tengah, y, {
    huruf: font(400, 11.5),
    warna: WARNA.redupMuda,
    rata: "center",
  });
}

/* ---------- API publik ---------- */

/** Menggambar detail pesanan ke elemen canvas (belum diunduh). */
export function gambarDetailPesanan(pesanan) {
  if (!pesanan) throw new Error("Data pesanan tidak tersedia.");

  const pengukur = document.createElement("canvas");
  const ctxUkur = pengukur.getContext("2d");
  if (!ctxUkur) throw new Error("Browser tidak mendukung pembuatan gambar.");

  const isi = susunIsi(pesanan, ctxUkur);
  const tinggi = tinggiGambar(isi);

  const kanvas = document.createElement("canvas");
  kanvas.width = LEBAR * SKALA;
  kanvas.height = tinggi * SKALA;

  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pembuatan gambar.");

  ctx.scale(SKALA, SKALA);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LEBAR, tinggi);
  ctx.textBaseline = "alphabetic";

  gambarIsi(ctx, pesanan, isi);

  return kanvas;
}

function namaBerkas(pesanan) {
  const dasar = String(
    pesanan?.kodeKlaim ?? pesanan?.idPesanan ?? pesanan?.id ?? "pesanan",
  )
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `detail-pesanan-${dasar || "market-day"}.png`;
}

/** Membuat lalu mengunduh gambar detail pesanan sebagai PNG. */
export async function unduhDetailPesanan(pesanan) {
  const kanvas = gambarDetailPesanan(pesanan);

  const blob = await new Promise((selesai) => {
    kanvas.toBlob(selesai, "image/png");
  });

  if (!blob) throw new Error("Gambar pesanan gagal dibuat.");

  const url = URL.createObjectURL(blob);
  const tautan = document.createElement("a");
  tautan.href = url;
  tautan.download = namaBerkas(pesanan);
  tautan.rel = "noopener";
  document.body.appendChild(tautan);
  tautan.click();
  tautan.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 10000);

  return tautan.download;
}
