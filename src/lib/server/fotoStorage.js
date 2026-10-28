import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const BATAS_UKURAN_FOTO = 5 * 1024 * 1024;
const KUOTA_PENYIMPANAN_TOKO = 50 * 1024 * 1024;

function galatDenganStatus(pesan, status) {
  const error = new Error(pesan);
  error.status = status;
  return error;
}

function teksAscii(buffer, mulai, panjang) {
  return String.fromCharCode(...buffer.slice(mulai, mulai + panjang));
}

/**
 * Mendeteksi format dari magic bytes, bukan dari header Content-Type yang
 * dikirim klien.
 */
async function deteksiFormatFoto(file) {
  const buffer = new Uint8Array(await file.slice(0, 32).arrayBuffer());

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: "image/jpeg", ekstensi: "jpg" };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ekstensi: "png" };
  }

  if (
    buffer.length >= 12 &&
    teksAscii(buffer, 0, 4) === "RIFF" &&
    teksAscii(buffer, 8, 4) === "WEBP"
  ) {
    return { mime: "image/webp", ekstensi: "webp" };
  }

  if (buffer.length >= 12 && teksAscii(buffer, 4, 4) === "ftyp") {
    const merek = teksAscii(buffer, 8, 4);
    if (merek === "avif" || merek === "avis") {
      return { mime: "image/avif", ekstensi: "avif" };
    }
  }

  return null;
}

/**
 * Validasi file foto yang dikirim lewat FormData.
 * Mengembalikan format hasil deteksi atau melempar error dengan status 400.
 */
export async function validasiFoto(file, label = "foto") {
  if (!(file instanceof File) || file.size === 0) {
    throw galatDenganStatus(`Pilih ${label}.`, 400);
  }

  if (file.size > BATAS_UKURAN_FOTO) {
    throw galatDenganStatus(`Ukuran ${label} maksimal 5 MB.`, 400);
  }

  const format = await deteksiFormatFoto(file);
  if (!format) {
    throw galatDenganStatus(
      `Isi ${label} harus berupa gambar JPG, PNG, WebP, atau AVIF.`,
      400,
    );
  }

  const tipeDiklaim = String(file.type || "").toLowerCase();
  const tipeNormal =
    tipeDiklaim === "image/jpg" ? "image/jpeg" : tipeDiklaim;

  if (tipeNormal && tipeNormal !== format.mime) {
    throw galatDenganStatus(
      `Tipe file ${label} tidak sesuai dengan isi gambarnya.`,
      400,
    );
  }

  return format;
}

async function totalUkuranToko(supabase, bucket, folder) {
  const akar = folder.split("/")[0];
  const [utama, profil] = await Promise.all([
    supabase.storage.from(bucket).list(akar, { limit: 1000 }),
    supabase.storage.from(bucket).list(`${akar}/profil`, { limit: 1000 }),
  ]);

  let total = 0;
  for (const hasil of [utama, profil]) {
    if (hasil.error) {
      console.warn("Gagal menghitung kuota penyimpanan toko:", hasil.error);
      continue;
    }

    for (const file of hasil.data ?? []) {
      total += Number(file.metadata?.size ?? 0);
    }
  }

  return total;
}

/**
 * Unggah foto ke Supabase Storage memakai service role.
 * Dipakai oleh foto produk dan foto profil toko.
 * `folder` sebaiknya berisi id toko agar file mudah dikelompokkan.
 */
export async function unggahFoto({
  file,
  folder,
  namaDasar = "foto",
  label = "foto",
}) {
  const format = await validasiFoto(file, label);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const konfigurasiKurang = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
    ["SUPABASE_STORAGE_BUCKET", bucket],
  ]
    .filter(([, nilai]) => !nilai)
    .map(([nama]) => nama);

  if (konfigurasiKurang.length > 0) {
    const pesan = `Konfigurasi Supabase Storage belum lengkap. Atur ${konfigurasiKurang.join(", ")} di .env.local.`;
    console.error(pesan);
    throw galatDenganStatus(pesan, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const terpakai = await totalUkuranToko(supabase, bucket, folder);
  if (terpakai + file.size > KUOTA_PENYIMPANAN_TOKO) {
    throw galatDenganStatus(
      "Kuota penyimpanan toko (50 MB) sudah penuh. Hapus foto lama terlebih dahulu.",
      413,
    );
  }

  const namaFile = `${folder}/${namaDasar}-${randomUUID()}.${format.ekstensi}`;

  const { error } = await supabase.storage.from(bucket).upload(namaFile, file, {
    cacheControl: "31536000",
    contentType: format.mime,
    upsert: false,
  });

  if (error) {
    console.error(`Gagal mengunggah ${label} ke Supabase Storage:`, error);
    throw galatDenganStatus(`Gagal mengunggah ${label}. Coba lagi.`, 502);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(namaFile);
  return data.publicUrl;
}
