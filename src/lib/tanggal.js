const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const NAMA_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

/**
 * Mengambil bagian tanggal (YYYY-MM-DD) dari nilai ISO/timestamp.
 * Mengembalikan string kosong bila nilainya tidak valid.
 */
export function kunciTanggal(nilai) {
  const teks = String(nilai ?? "");
  return /^\d{4}-\d{2}-\d{2}/.test(teks) ? teks.slice(0, 10) : "";
}

/**
 * Mengubah "2026-10-29" menjadi "29 Oktober 2026" (atau
 * "Kamis, 29 Oktober 2026" bila denganHari = true).
 */
export function formatTanggal(nilai, { denganHari = false } = {}) {
  const kunci = kunciTanggal(nilai);
  if (!kunci) return "-";

  const [tahun, bulan, tanggal] = kunci.split("-").map(Number);
  if (!tahun || !bulan || !tanggal || bulan < 1 || bulan > 12) return "-";

  const teks = `${tanggal} ${NAMA_BULAN[bulan - 1]} ${tahun}`;
  if (!denganHari) return teks;

  const hari = new Date(Date.UTC(tahun, bulan - 1, tanggal)).getUTCDay();
  return `${NAMA_HARI[hari]}, ${teks}`;
}

/**
 * Mengubah "2026-10" menjadi "Oktober 2026".
 */
export function formatBulan(kunciBulan) {
  const [tahun, bulan] = String(kunciBulan ?? "").split("-").map(Number);
  if (!tahun || !bulan || bulan < 1 || bulan > 12) return "-";
  return `${NAMA_BULAN[bulan - 1]} ${tahun}`;
}
