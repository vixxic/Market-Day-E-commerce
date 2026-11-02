import { timingSafeEqual } from "crypto";
import { normalisasiPromo } from "@/lib/promoProduk";

export const POLA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function galatValidasi(pesan, status = 400) {
  const error = new Error(pesan);
  error.status = status;
  error.publik = true;
  return error;
}

export function teksWajib(nilai, label, { min = 1, max = 80 } = {}) {
  if (typeof nilai !== "string") {
    throw galatValidasi(`${label} wajib diisi.`);
  }

  const teks = nilai.trim();
  if (teks.length < min || teks.length > max) {
    throw galatValidasi(
      `${label} harus terdiri dari ${min}–${max} karakter.`,
    );
  }

  return teks;
}

export function teksOpsional(nilai, label, { max = 600 } = {}) {
  if (nilai === null || nilai === undefined) return null;
  if (typeof nilai !== "string") {
    throw galatValidasi(`${label} harus berupa teks.`);
  }

  const teks = nilai.trim();
  if (teks.length > max) {
    throw galatValidasi(`${label} maksimal ${max} karakter.`);
  }

  return teks || null;
}

export function daftarTeks(
  nilai,
  label,
  { maksItem = 10, maksPanjang = 40 } = {},
) {
  if (nilai === null || nilai === undefined) return [];

  if (!Array.isArray(nilai)) {
    throw galatValidasi(`${label} harus berupa daftar.`);
  }

  if (nilai.length > maksItem) {
    throw galatValidasi(`${label} maksimal ${maksItem} item.`);
  }

  const hasil = [];
  for (const item of nilai) {
    if (typeof item !== "string") {
      throw galatValidasi(`${label} hanya boleh berisi teks.`);
    }

    const teks = item.trim();
    if (!teks) continue;
    if (teks.length > maksPanjang) {
      throw galatValidasi(
        `${label} maksimal ${maksPanjang} karakter per item.`,
      );
    }
    hasil.push(teks);
  }

  return hasil;
}

/**
 * Daftar ukuran produk. Menerima format baru { nama, harga } maupun format
 * lama berupa teks (harga memakai hargaDasar). Mengembalikan bentuk baku
 * [{ nama, harga }] tanpa duplikat.
 */
export function daftarUkuran(
  nilai,
  label,
  { maksItem = 10, maksPanjang = 40, hargaDasar } = {},
) {
  if (nilai === null || nilai === undefined) return [];

  if (!Array.isArray(nilai)) {
    throw galatValidasi(`${label} harus berupa daftar.`);
  }

  if (nilai.length > maksItem) {
    throw galatValidasi(`${label} maksimal ${maksItem} item.`);
  }

  let hargaCadangan = null;
  let cadanganDihitung = false;
  const ambilHargaCadangan = () => {
    if (!cadanganDihitung) {
      cadanganDihitung = true;
      hargaCadangan =
        hargaDasar === null || hargaDasar === undefined || hargaDasar === ""
          ? null
          : hargaValid(hargaDasar, "Harga produk");
    }
    return hargaCadangan;
  };

  const hasil = [];
  const namaTerpakai = new Set();

  for (const item of nilai) {
    let nama = "";
    let harga = null;

    if (typeof item === "string") {
      nama = item.trim();
      harga = ambilHargaCadangan();
    } else if (item && typeof item === "object" && !Array.isArray(item)) {
      if (typeof item.nama !== "string") {
        throw galatValidasi(`${label} hanya boleh berisi nama ukuran.`);
      }

      nama = item.nama.trim();
      harga =
        item.harga === null || item.harga === undefined || item.harga === ""
          ? ambilHargaCadangan()
          : hargaValid(item.harga, `Harga ukuran "${nama}"`);
    } else {
      throw galatValidasi(`${label} hanya boleh berisi nama ukuran.`);
    }

    if (!nama) continue;

    if (nama.length > maksPanjang) {
      throw galatValidasi(
        `${label} maksimal ${maksPanjang} karakter per item.`,
      );
    }

    const kunci = nama.toLocaleLowerCase("id");
    if (namaTerpakai.has(kunci)) {
      throw galatValidasi(`Ukuran "${nama}" ditulis lebih dari sekali.`);
    }
    namaTerpakai.add(kunci);

    if (!harga) {
      throw galatValidasi(`Harga ukuran "${nama}" wajib diisi.`);
    }

    hasil.push({ nama, harga });
  }

  return hasil;
}

/**
 * Promo produk. null, objek kosong, atau { aktif: false } berarti tanpa promo.
 * Isian yang tidak dikenali ditolak agar penjual tidak menyimpan promo diam-diam.
 */
export function promoValid(nilai) {
  if (nilai === null || nilai === undefined) return null;
  if (typeof nilai !== "object" || Array.isArray(nilai)) {
    throw galatValidasi("Promo harus berupa objek.");
  }
  if (Object.keys(nilai).length === 0 || nilai.aktif === false) return null;

  const promo = normalisasiPromo(nilai);
  if (!promo) {
    throw galatValidasi(
      "Promo tidak valid. Periksa jumlah beli/gratis atau nilai diskonnya.",
    );
  }

  return promo;
}

export function hargaValid(nilai, label = "Harga") {
  const harga = Number(nilai);
  if (!Number.isFinite(harga) || harga <= 0 || harga > 100_000_000) {
    throw galatValidasi(`${label} harus berupa angka yang valid.`);
  }

  return Math.round(harga);
}

export function stokValid(nilai) {
  if (
    (typeof nilai !== "number" && typeof nilai !== "string") ||
    String(nilai).trim() === ""
  ) {
    throw galatValidasi("Stok produk wajib diisi.");
  }

  const stok = Number(nilai);
  if (!Number.isSafeInteger(stok) || stok < 0 || stok > 2_147_483_647) {
    throw galatValidasi("Stok produk harus berupa bilangan bulat minimal 0.");
  }

  return stok;
}

export function urlGambarAman(nilai, label) {  if (nilai === null || nilai === undefined || nilai === "") return null;
  if (typeof nilai !== "string") {
    throw galatValidasi(`${label} tidak valid.`);
  }

  const url = nilai.trim();
  if (!url) return null;

  if (url.length > 2000) {
    throw galatValidasi(`${label} terlalu panjang.`);
  }

  // Path relatif milik aplikasi. Tolak //host agar tidak menjadi protokol-relatif.
  if (url.startsWith("/")) {
    if (url.startsWith("//")) {
      throw galatValidasi(`${label} harus berupa URL gambar yang valid.`);
    }
    return url;
  }

  let terurai;
  try {
    terurai = new URL(url);
  } catch {
    throw galatValidasi(`${label} harus berupa URL gambar yang valid.`);
  }

  const protokolDiizinkan =
    process.env.NODE_ENV === "production"
      ? ["https:"]
      : ["https:", "http:"];

  if (
    !protokolDiizinkan.includes(terurai.protocol) ||
    !terurai.hostname ||
    terurai.username ||
    terurai.password
  ) {
    throw galatValidasi(`${label} harus berupa URL gambar yang valid.`);
  }

  return terurai.toString();
}

export function daftarUrlGambar(nilai, label, { maksItem = 5 } = {}) {
  const mentah = Array.isArray(nilai) ? nilai : nilai ? [nilai] : [];

  if (mentah.length === 0 || mentah.length > maksItem) {
    throw galatValidasi(`${label} harus berisi 1 sampai ${maksItem} foto.`);
  }

  const hasil = mentah
    .map((url) => urlGambarAman(url, label))
    .filter((url) => Boolean(url));

  if (hasil.length === 0) {
    throw galatValidasi(`${label} harus berisi minimal satu foto.`);
  }

  return hasil;
}

/** Perbandingan string constant-time untuk secret berukuran sama. */
export function bandingKonstan(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length || bufferA.length === 0) return false;
  return timingSafeEqual(bufferA, bufferB);
}
