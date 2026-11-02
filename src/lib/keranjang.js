// Penyimpanan keranjang di browser (localStorage).
//
// Bentuk data satu produk di keranjang:
// {
//   idProduk: "1", nama: "Cookies", harga: 15000, gambar: "https://...",
//   promo: { jenis: "beli_gratis", beli: 1, gratis: 1 } | null,
//   varian: [
//     { jenis: "Cokelat", ukuran: "Medium", jumlah: 2 },
//     { jenis: "Matcha",  ukuran: "Large",  jumlah: 1 },
//   ]
// }

import {
  getLocalStorageSnapshot,
  subscribeLocalStorage,
  writeLocalStorage,
} from "@/lib/localStorageStore";
import { hitungPromo } from "@/lib/promoProduk";

const KUNCI = "keranjang-marketday";

export function getKeranjangSnapshot() {
  return getLocalStorageSnapshot(KUNCI);
}

export function subscribeKeranjang(listener) {
  return subscribeLocalStorage(KUNCI, listener);
}

export function ambilKeranjang() {
  try {
    const mentah = getKeranjangSnapshot();
    const data = mentah ? JSON.parse(mentah) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Data keranjang di browser tidak valid.", error);
    return [];
  }
}

function simpan(keranjang) {
  writeLocalStorage(KUNCI, JSON.stringify(keranjang));
  return keranjang;
}

/**
 * Menambahkan hasil dari PanelBeli ke keranjang.
 * Produk yang sama digabung jadi satu kartu, dan varian yang sama
 * (jenis + ukuran) jumlahnya dijumlahkan.
 */
export function tambahKeKeranjang(pesanan) {
  const keranjang = ambilKeranjang();

  for (const p of pesanan) {
    let item = keranjang.find(
      (i) => String(i.idProduk) === String(p.idProduk),
    );
    if (!item) {
      item = {
        idProduk: p.idProduk,
        id_toko: p.id_toko ?? null,
        nama: p.nama,
        harga: p.harga,
        gambar: p.gambar ?? null,
        promo: p.promo ?? null,
        varian: [],
      };
      keranjang.push(item);
    }

    if (!item.id_toko && p.id_toko) item.id_toko = p.id_toko;
    // Promo bisa berubah di toko; selalu pakai promo terbaru dari PanelBeli.
    item.promo = p.promo ?? null;

    const harga = Number(p.harga);
    const hargaVarian = Number.isFinite(harga) && harga > 0 ? harga : null;
    const sama = item.varian.find(
      (v) => v.jenis === p.jenis && v.ukuran === p.ukuran,
    );
    if (sama) {
      sama.jumlah += p.jumlah;
      if (hargaVarian !== null) sama.harga = hargaVarian;
    } else {
      item.varian.push({
        jenis: p.jenis,
        ukuran: p.ukuran,
        jumlah: p.jumlah,
        harga: hargaVarian,
      });
    }
  }

  return simpan(keranjang);
}

export function hapusDariKeranjang(idProduk) {
  return simpan(
    ambilKeranjang().filter(
      (i) => String(i.idProduk) !== String(idProduk),
    ),
  );
}

export function ubahJumlah(idProduk, varian, jumlah) {
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 99) {
    throw new Error("Jumlah harus berupa bilangan bulat antara 1 dan 99.");
  }

  const keranjang = ambilKeranjang();
  const item = keranjang.find(
    (baris) => String(baris.idProduk) === String(idProduk),
  );
  if (!item) throw new Error(`Produk "${idProduk}" tidak ditemukan di keranjang.`);

  const itemVarian = item.varian.find(
    (baris) =>
      baris.jenis === varian.jenis && baris.ukuran === varian.ukuran,
  );
  if (!itemVarian) {
    throw new Error("Varian produk tidak ditemukan di keranjang.");
  }

  itemVarian.jumlah = jumlah;

  return simpan(keranjang);
}

export function kosongkanKeranjang() {
  return simpan([]);
}

/** Harga satu baris varian: harga ukuran, atau harga produk untuk data lama. */
export function hargaBaris(item, varian) {
  const hargaVarian = Number(varian?.harga);
  if (Number.isFinite(hargaVarian) && hargaVarian > 0) return hargaVarian;

  const hargaItem = Number(item?.harga);
  return Number.isFinite(hargaItem) && hargaItem > 0 ? hargaItem : 0;
}

/**
 * Rincian satu baris varian setelah promo produk:
 * { jumlah, dibayar, gratis, diskon, subtotal }
 */
export function totalBaris(item, varian) {
  return hitungPromo(
    item?.promo,
    hargaBaris(item, varian),
    varian?.jumlah ?? 0,
  );
}

export function hitungTotal(keranjang = ambilKeranjang()) {
  return keranjang.reduce(
    (total, item) =>
      total +
      item.varian.reduce(
        (jumlah, varian) => jumlah + totalBaris(item, varian).subtotal,
        0,
      ),
    0,
  );
}
