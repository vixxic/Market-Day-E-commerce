// Penyimpanan keranjang di browser (localStorage).
//
// Bentuk data satu produk di keranjang:
// {
//   idProduk: "1", nama: "Cookies", harga: 15000, gambar: "https://...", qris: "https://...",
//   varian: [
//     { jenis: "Cokelat", ukuran: "Medium", jumlah: 2 },
//     { jenis: "Matcha",  ukuran: "Large",  jumlah: 1 },
//   ]
// }

const KUNCI = "keranjang-marketday";

export function ambilKeranjang() {
  try {
    const mentah = localStorage.getItem(KUNCI);
    const data = mentah ? JSON.parse(mentah) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function simpan(keranjang) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(keranjang));
  } catch {
    // penyimpanan penuh / diblokir: abaikan
  }
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
    let item = keranjang.find((i) => i.idProduk === p.idProduk);
    if (!item) {
      item = {
        idProduk: p.idProduk,
        nama: p.nama,
        harga: p.harga,
        gambar: p.gambar ?? null,
        qris: p.qris ?? null,
        varian: [],
      };
      keranjang.push(item);
    }

    if (!item.qris && p.qris) item.qris = p.qris;

    const sama = item.varian.find(
      (v) => v.jenis === p.jenis && v.ukuran === p.ukuran,
    );
    if (sama) sama.jumlah += p.jumlah;
    else
      item.varian.push({ jenis: p.jenis, ukuran: p.ukuran, jumlah: p.jumlah });
  }

  return simpan(keranjang);
}

export function hapusDariKeranjang(idProduk) {
  return simpan(ambilKeranjang().filter((i) => i.idProduk !== idProduk));
}
