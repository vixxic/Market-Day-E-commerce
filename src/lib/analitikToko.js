const STATUS_DITERIMA = new Set(["diproses", "selesai", "terverifikasi"]);
const PANJANG_GRAFIK = 7;

function angka(nilai) {
  const hasil = Number(nilai);
  return Number.isFinite(hasil) ? hasil : 0;
}

function daftarItem(pesanan) {
  if (Array.isArray(pesanan.items)) return pesanan.items;
  if (Array.isArray(pesanan.item)) return pesanan.item;
  return [];
}

function jumlahProdukItem(item) {
  return Math.max(
    0,
    Math.floor(angka(item.jumlah ?? item.varian?.jumlah ?? 1)),
  );
}

function subtotalItem(item) {
  const jumlah = jumlahProdukItem(item);
  const subtotal = angka(item.subtotal);
  if (subtotal > 0) return subtotal;
  return angka(item.harga) * jumlah;
}

function totalPesanan(pesanan) {
  const total = angka(pesanan.total);
  if (total > 0) return total;
  return daftarItem(pesanan).reduce(
    (jumlah, item) => jumlah + subtotalItem(item),
    0,
  );
}

function kunciTanggal(nilai) {
  const teks = String(nilai ?? "");
  if (/^\d{4}-\d{2}-\d{2}/.test(teks)) return teks.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function gambarProduk(produk) {
  const galeri = Array.isArray(produk?.gambar_list)
    ? produk.gambar_list
    : Array.isArray(produk?.image)
      ? produk.image
      : [];
  const gambar = galeri.find((item) => typeof item === "string" && item.trim());
  return gambar ?? produk?.gambar ?? null;
}

function deretTujuhHari() {
  const hariIni = new Date();
  hariIni.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: PANJANG_GRAFIK }, (_, posisi) => {
    const tanggal = new Date(hariIni);
    tanggal.setUTCDate(tanggal.getUTCDate() - (PANJANG_GRAFIK - 1 - posisi));
    return {
      tanggal: tanggal.toISOString().slice(0, 10),
      pendapatan: 0,
      pesanan: 0,
    };
  });
}

/**
 * Menghitung ringkasan analitik dari pesanan, produk, dan kunjungan produk.
 * Fungsi murni agar mudah dipakai ulang atau diuji.
 */
export function hitungAnalitik({
  orders = [],
  products = [],
  views = [],
  viewsTersedia = true,
} = {}) {
  const petaProduk = new Map(
    products.map((produk) => [String(produk.id), produk]),
  );
  const grafik = deretTujuhHari();
  const petaGrafik = new Map(grafik.map((hari) => [hari.tanggal, hari]));
  const status = {};
  const produkTerjual = new Map();
  const kunjungan = new Map();

  let totalPendapatan = 0;
  let pesananDiterima = 0;
  let pesananSelesai = 0;
  let menungguKonfirmasi = 0;
  let jumlahProdukTerjual = 0;

  for (const pesanan of orders) {
    status[pesanan.status] = (status[pesanan.status] ?? 0) + 1;

    if (pesanan.status === "menunggu_konfirmasi") menungguKonfirmasi += 1;
    if (pesanan.status === "selesai" || pesanan.status === "terverifikasi") {
      pesananSelesai += 1;
    }

    if (!STATUS_DITERIMA.has(pesanan.status)) continue;

    const total = totalPesanan(pesanan);
    const tanggal = kunciTanggal(pesanan.created_at);
    totalPendapatan += total;
    pesananDiterima += 1;

    const hari = petaGrafik.get(tanggal);
    if (hari) {
      hari.pendapatan += total;
      hari.pesanan += 1;
    }

    for (const item of daftarItem(pesanan)) {
      const jumlah = jumlahProdukItem(item);
      if (jumlah === 0) continue;

      const idProduk = item.id_produk ?? item.idProduk ?? item.id;
      const kunci = idProduk ? String(idProduk) : String(item.nama ?? "lainnya");
      const produk = idProduk ? petaProduk.get(String(idProduk)) : null;
      const sebelumnya = produkTerjual.get(kunci) ?? {
        id: idProduk ? String(idProduk) : null,
        nama: produk?.nama ?? item.nama ?? "Produk",
        gambar: gambarProduk(produk) ?? item.gambar ?? null,
        jumlah: 0,
        pendapatan: 0,
      };

      sebelumnya.jumlah += jumlah;
      sebelumnya.pendapatan += subtotalItem(item);
      produkTerjual.set(kunci, sebelumnya);
      jumlahProdukTerjual += jumlah;
    }
  }

  for (const kunjunganItem of views) {
    const idProduk = kunjunganItem.id_produk ?? kunjunganItem.idProduk;
    if (!idProduk) continue;
    const kunci = String(idProduk);
    kunjungan.set(kunci, (kunjungan.get(kunci) ?? 0) + 1);
  }

  const produkTeratas = [...produkTerjual.entries()]
    .map(([id, nilai]) => ({
      ...nilai,
      dilihat: kunjungan.get(id) ?? 0,
    }))
    .sort((a, b) => b.jumlah - a.jumlah || b.pendapatan - a.pendapatan)
    .slice(0, 5);

  const palingDilihat = [...kunjungan.entries()]
    .map(([id, jumlah]) => {
      const produk = petaProduk.get(id);
      return {
        id,
        nama: produk?.nama ?? "Produk",
        gambar: gambarProduk(produk),
        dilihat: jumlah,
      };
    })
    .sort((a, b) => b.dilihat - a.dilihat)
    .slice(0, 5);

  const totalDilihat = views.length;

  return {
    ringkasan: {
      totalPendapatan,
      totalPesanan: orders.length,
      pesananDiterima,
      pesananSelesai,
      menungguKonfirmasi,
      produkTerjual: jumlahProdukTerjual,
      totalDilihat,
      konversi:
        totalDilihat > 0 ? (pesananDiterima / totalDilihat) * 100 : 0,
      rataRataPesanan:
        pesananDiterima > 0 ? totalPendapatan / pesananDiterima : 0,
    },
    grafik,
    produkTeratas,
    palingDilihat,
    status,
    viewsTersedia,
  };
}
