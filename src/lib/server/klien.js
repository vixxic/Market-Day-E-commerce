import { createHmac } from "crypto";

/**
 * Mengambil IP klien dari header proxy. Urutan ini memprioritaskan header yang
 * ditimpa oleh platform (Vercel/Cloudflare) sebelum X-Forwarded-For mentah.
 *
 * Catatan: bila aplikasi dijalankan tanpa reverse proxy, header ini dapat
 * dipalsukan klien. Batas berbasis IP adalah lapisan tambahan, bukan satu-satunya
 * kontrol keamanan.
 */
export function ambilIpKlien(request) {
  const header = request.headers;
  const kandidat = [
    header.get("x-vercel-forwarded-for"),
    header.get("cf-connecting-ip"),
    header.get("x-real-ip"),
    header.get("x-forwarded-for"),
  ];

  for (const nilai of kandidat) {
    if (!nilai) continue;
    const ip = nilai.split(",")[0].trim();
    if (ip && ip.length <= 64) return ip;
  }

  return "lokal";
}

/** Menghasilkan penanda IP yang tidak menyimpan alamat asli di database. */
export function hashIp(ip) {
  const rahasia =
    process.env.OTP_HASH_SECRET ||
    process.env.TOKO_SESSION_SECRET ||
    "marketday-ip-dev-secret";

  return createHmac("sha256", rahasia).update(String(ip)).digest("hex").slice(0, 24);
}
