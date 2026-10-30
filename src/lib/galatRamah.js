/**
 * Pesan galat yang aman ditampilkan ke pengguna.
 *
 * Aturan mainnya: detail teknis (pesan Supabase, kode status, error jaringan
 * dari browser seperti "Failed to fetch") tidak boleh pernah tampil di UI.
 * Yang tampil hanya pesan umum di bawah ini, atau pesan validasi 4xx yang
 * memang ditulis untuk pengguna oleh route API.
 */
export const PESAN_GALAT =
  "Terjadi kesalahan. Silakan coba lagi, atau hubungi operator situs bila masalah ini berlanjut.";

export const PESAN_KONEKSI =
  "Tidak dapat terhubung ke server. Periksa koneksi internetmu, lalu coba lagi.";

export function galatRamah(pesan = PESAN_GALAT, penyebab = null) {
  const galat = new Error(pesan);
  galat.name = "GalatRamah";
  galat.pesanAman = pesan;
  if (penyebab) galat.penyebab = penyebab;
  return galat;
}

export function pesanGalat(galat, cadangan = PESAN_GALAT) {
  if (!galat) return cadangan;
  return galat.pesanAman || cadangan;
}

/**
 * Pesan dari server diteruskan hanya bila statusnya 4xx dan isinya wajar
 * (validasi/izin). Status 5xx, balasan kosong, atau pesan kepanjangan
 * dianggap kegagalan internal sehingga diganti pesan umum.
 */
export function pesanDariRespons(respons, data) {
  const pesan = data?.error;
  const aman =
    respons.status >= 400 &&
    respons.status < 500 &&
    typeof pesan === "string" &&
    pesan.trim().length > 0 &&
    pesan.length <= 160;

  return aman ? pesan : PESAN_GALAT;
}

export async function ambilJsonAman(url, opsi) {
  let respons;
  try {
    respons = await fetch(url, opsi);
  } catch (galat) {
    if (galat?.name === "AbortError") throw galat;
    throw galatRamah(PESAN_KONEKSI, galat);
  }

  let data = null;
  if (respons.status !== 204) {
    try {
      data = await respons.json();
    } catch (galat) {
      if (respons.ok) throw galatRamah(PESAN_GALAT, galat);
    }
  }

  if (!respons.ok) {
    const galat = galatRamah(pesanDariRespons(respons, data), data?.error);
    galat.status = respons.status;
    throw galat;
  }

  return data;
}
