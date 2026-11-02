// Promo per produk.
//
// Bentuk data di products.promo (jsonb):
//   { "jenis": "beli_gratis", "beli": 1, "gratis": 1 }
//   { "jenis": "diskon_jumlah", "minJumlah": 5, "tipe": "persen", "nilai": 10 }
//
// Promo dihitung dari harga satuan (harga ukuran bila ada) dan jumlah barang,
// lalu dipakai halaman pembeli maupun Route Handler pesanan supaya angka yang
// dilihat pembeli sama dengan yang disimpan server.

export const PROMO_BELI_GRATIS = "beli_gratis";
export const PROMO_DISKON_JUMLAH = "diskon_jumlah";

const BATAS = {
  beli: { min: 1, maks: 20 },
  gratis: { min: 1, maks: 20 },
  minJumlah: { min: 2, maks: 99 },
  persen: { min: 1, maks: 100 },
  nominal: { min: 1, maks: 10_000_000 },
};

function angkaBulat(nilai, { min, maks }) {
  const angka = Math.round(Number(nilai));
  if (!Number.isFinite(angka) || angka < min || angka > maks) return 0;
  return angka;
}

/**
 * Membakukan isi products.promo. Mengembalikan null bila promo kosong atau
 * tidak dikenali, sehingga pemanggil bisa memperlakukan "tanpa promo" sama.
 */
export function normalisasiPromo(nilai) {
  if (!nilai || typeof nilai !== "object" || Array.isArray(nilai)) return null;
  if (nilai.aktif === false) return null;

  if (nilai.jenis === PROMO_BELI_GRATIS) {
    const beli = angkaBulat(nilai.beli, BATAS.beli);
    const gratis = angkaBulat(nilai.gratis, BATAS.gratis);
    if (!beli || !gratis) return null;
    return { aktif: true, jenis: PROMO_BELI_GRATIS, beli, gratis };
  }

  if (nilai.jenis === PROMO_DISKON_JUMLAH) {
    const minJumlah = angkaBulat(nilai.minJumlah, BATAS.minJumlah);
    const tipe = nilai.tipe === "nominal" ? "nominal" : "persen";
    const batas = tipe === "nominal" ? BATAS.nominal : BATAS.persen;
    const nilaiDiskon = angkaBulat(nilai.nilai, batas);
    if (!minJumlah || !nilaiDiskon) return null;
    return {
      aktif: true,
      jenis: PROMO_DISKON_JUMLAH,
      minJumlah,
      tipe,
      nilai: nilaiDiskon,
    };
  }

  return null;
}

/** true bila produk punya promo yang bisa dipakai. */
export function adaPromo(nilai) {
  return normalisasiPromo(nilai) !== null;
}

function rupiah(angka) {
  return "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(angka));
}

/** Kalimat singkat untuk ditampilkan ke pembeli/penjual. */
export function labelPromo(nilai) {
  const promo = normalisasiPromo(nilai);
  if (!promo) return "";

  if (promo.jenis === PROMO_BELI_GRATIS) {
    return `Beli ${promo.beli} gratis ${promo.gratis}`;
  }

  const potongan =
    promo.tipe === "persen"
      ? `Diskon ${promo.nilai}%`
      : `Potongan ${rupiah(promo.nilai)}/item`;

  return `${potongan} mulai ${promo.minJumlah} pcs`;
}

/** Keterangan lebih panjang untuk halaman detail produk. */
export function keteranganPromo(nilai) {
  const promo = normalisasiPromo(nilai);
  if (!promo) return "";

  if (promo.jenis === PROMO_BELI_GRATIS) {
    return `Setiap beli ${promo.beli} pcs, ${promo.gratis} pcs gratis. Berlaku otomatis saat pesanan dibuat.`;
  }

  return promo.tipe === "persen"
    ? `Beli minimal ${promo.minJumlah} pcs, potongan ${promo.nilai}% dari subtotal.`
    : `Beli minimal ${promo.minJumlah} pcs, potongan ${rupiah(promo.nilai)} per item.`;
}

/**
 * Menghitung satu baris pesanan.
 *
 * Hasil:
 * - jumlah   : jumlah yang dipesan
 * - dibayar  : jumlah yang dihitung bayar (untuk promo beli-gratis)
 * - gratis   : jumlah yang gratis
 * - diskon   : nilai potongan dalam rupiah
 * - subtotal : harga satuan x jumlah - diskon
 */
export function hitungPromo(nilaiPromo, hargaSatuan, jumlah) {
  const harga = Math.max(0, Math.round(Number(hargaSatuan) || 0));
  const banyak = Math.max(0, Math.round(Number(jumlah) || 0));
  const penuh = harga * banyak;

  const tanpa = {
    jumlah: banyak,
    dibayar: banyak,
    gratis: 0,
    diskon: 0,
    subtotal: penuh,
  };

  const promo = normalisasiPromo(nilaiPromo);
  if (!promo || banyak < 1 || harga < 1) return tanpa;

  if (promo.jenis === PROMO_BELI_GRATIS) {
    const satuGrup = promo.beli + promo.gratis;
    const grup = Math.floor(banyak / satuGrup);
    if (grup < 1) return tanpa;

    const sisa = banyak % satuGrup;
    const dibayar = grup * promo.beli + Math.min(sisa, promo.beli);
    const gratis = banyak - dibayar;

    return {
      jumlah: banyak,
      dibayar,
      gratis,
      diskon: harga * gratis,
      subtotal: harga * dibayar,
    };
  }

  if (banyak < promo.minJumlah) return tanpa;

  const diskon =
    promo.tipe === "persen"
      ? Math.round((penuh * promo.nilai) / 100)
      : Math.min(penuh, promo.nilai * banyak);

  return {
    jumlah: banyak,
    dibayar: banyak,
    gratis: 0,
    diskon,
    subtotal: penuh - diskon,
  };
}

/** Pesan galat pertama untuk isian promo di form penjual, atau "". */
export function validasiPromoForm(promo) {
  if (!promo) return "";

  if (promo.jenis === PROMO_BELI_GRATIS) {
    const beli = angkaBulat(promo.beli, BATAS.beli);
    const gratis = angkaBulat(promo.gratis, BATAS.gratis);
    if (!beli) return "Jumlah beli harus antara 1 dan 20.";
    if (!gratis) return "Jumlah gratis harus antara 1 dan 20.";
    return "";
  }

  if (promo.jenis === PROMO_DISKON_JUMLAH) {
    const minJumlah = angkaBulat(promo.minJumlah, BATAS.minJumlah);
    if (!minJumlah) return "Minimal pembelian harus antara 2 dan 99.";
    if (promo.tipe === "nominal") {
      if (!angkaBulat(promo.nilai, BATAS.nominal)) {
        return "Potongan nominal harus antara 1 dan 10.000.000.";
      }
      return "";
    }
    if (!angkaBulat(promo.nilai, BATAS.persen)) {
      return "Diskon persen harus antara 1 dan 100.";
    }
    return "";
  }

  return "Jenis promo tidak dikenali.";
}
