import { createHmac, timingSafeEqual } from "crypto";

let sudahPeringatkan = false;

function rahasiaOtp() {
  const rahasia =
    process.env.OTP_HASH_SECRET || process.env.TOKO_SESSION_SECRET;

  if (!rahasia) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "OTP_HASH_SECRET atau TOKO_SESSION_SECRET wajib diatur untuk production.",
      );
    }

    if (!sudahPeringatkan) {
      console.warn(
        "OTP_HASH_SECRET/TOKO_SESSION_SECRET belum diatur. Memakai rahasia pengembangan.",
      );
      sudahPeringatkan = true;
    }

    return "marketday-otp-dev-secret";
  }

  return rahasia;
}

/** HMAC-SHA256 yang terikat ke ID pesanan, bukan hash tanpa salt. */
export function hashOtp(orderId, code) {
  return createHmac("sha256", rahasiaOtp())
    .update(`${orderId}:${code}`)
    .digest("hex");
}

export function otpCocok(orderId, code, hashTersimpan) {
  if (
    typeof hashTersimpan !== "string" ||
    !/^[0-9a-f]{64}$/i.test(hashTersimpan)
  ) {
    return false;
  }

  const diharapkan = Buffer.from(hashOtp(orderId, code), "hex");
  const tersimpan = Buffer.from(hashTersimpan, "hex");

  if (diharapkan.length !== tersimpan.length) return false;

  return timingSafeEqual(diharapkan, tersimpan);
}
