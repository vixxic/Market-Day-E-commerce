// Harga per ukuran produk.
//
// products.ukuran disimpan sebagai jsonb. Format baru:
//   [{ nama: "Small", harga: 5000 }]
// Format lama yang masih ada di database:
//   ["Small", "Medium"]
// Keduanya dinormalisasi jadi { nama, harga } supaya halaman penjual dan
// pembeli memakai bentuk yang sama. Ukuran lama memakai harga produk sebagai
// harga cadangan.

function angkaHarga(nilai, cadangan = 0) {
  const angka = Number(nilai);
  if (!Number.isFinite(angka) || angka <= 0) return cadangan;
  return Math.round(angka);
}

function kunciNama(nama) {
  return String(nama ?? "")
    .trim()
    .toLocaleLowerCase("id");
}

export function normalisasiUkuran(nilai, hargaDasar = 0) {
  const hargaBawaan = angkaHarga(hargaDasar);
  const hasil = [];
  const namaTerpakai = new Set();

  for (const item of Array.isArray(nilai) ? nilai : []) {
    let nama = "";
    let harga = hargaBawaan;

    if (typeof item === "string") {
      nama = item.trim();
    } else if (item && typeof item === "object") {
      nama = typeof item.nama === "string" ? item.nama.trim() : "";
      harga = angkaHarga(item.harga, hargaBawaan);
    }

    if (!nama) continue;

    const kunci = kunciNama(nama);
    if (namaTerpakai.has(kunci)) continue;
    namaTerpakai.add(kunci);

    hasil.push({ nama, harga });
  }

  return hasil;
}

/** Cari satu ukuran berdasarkan nama (tanpa membedakan huruf besar/kecil). */
export function cariUkuran(daftar, nama) {
  const kunci = kunciNama(nama);
  if (!kunci) return null;

  const cocok = (Array.isArray(daftar) ? daftar : []).find(
    (ukuran) => ukuran && kunciNama(ukuran.nama) === kunci,
  );

  return cocok ?? null;
}

/** Harga untuk satu ukuran; jatuh ke harga produk bila tidak ditemukan. */
export function hargaUntukUkuran(daftar, nama, hargaDasar = 0) {
  const cocok = cariUkuran(daftar, nama);
  if (cocok) return angkaHarga(cocok.harga, angkaHarga(hargaDasar));

  return angkaHarga(hargaDasar);
}

/** Harga termurah dari daftar ukuran; harga produk bila daftar kosong. */
export function hargaTerendah(daftar, hargaDasar = 0) {
  const daftarHarga = (Array.isArray(daftar) ? daftar : [])
    .map((ukuran) => angkaHarga(ukuran?.harga, 0))
    .filter((harga) => harga > 0);

  if (daftarHarga.length === 0) return angkaHarga(hargaDasar);
  return Math.min(...daftarHarga);
}

/** true bila ukuran punya lebih dari satu harga berbeda. */
export function hargaBeragam(daftar) {
  const daftarHarga = new Set(
    (Array.isArray(daftar) ? daftar : [])
      .map((ukuran) => angkaHarga(ukuran?.harga, 0))
      .filter((harga) => harga > 0),
  );

  return daftarHarga.size > 1;
}

/**
 * Validasi baris ukuran pada form penjual. Mengembalikan pesan galat pertama
 * atau string kosong bila semuanya valid.
 */
export function validasiUkuranForm(daftar) {
  const namaTerpakai = new Set();

  for (const item of Array.isArray(daftar) ? daftar : []) {
    const nama = String(item?.nama ?? "").trim();
    const harga = Number(item?.harga);

    if (!nama) return "Nama ukuran wajib diisi.";
    if (!Number.isFinite(harga) || harga < 1) {
      return `Harga ukuran "${nama}" wajib diisi.`;
    }

    const kunci = nama.toLocaleLowerCase("id");
    if (namaTerpakai.has(kunci)) {
      return `Ukuran "${nama}" ditulis lebih dari sekali.`;
    }
    namaTerpakai.add(kunci);
  }

  return "";
}
