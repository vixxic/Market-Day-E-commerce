import { randomBytes } from "crypto";

// 32 karakter tanpa huruf/angka yang mudah tertukar (0/O, 1/I).
// Karena alfabet tepat 32 karakter, `byte % 32` tidak bias.
const KARAKTER = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function acak(panjang) {
  const buffer = randomBytes(panjang);
  let hasil = "";

  for (let i = 0; i < panjang; i += 1) {
    hasil += KARAKTER[buffer[i] % KARAKTER.length];
  }

  return hasil;
}

/** ID pesanan dengan 100 bit entropi, dibuat sepenuhnya di server. */
export function buatIdPesanan() {
  return `ORD-${new Date().getFullYear()}-${acak(20)}`;
}

/** Kode klaim dengan 40 bit entropi. */
export function buatKodeKlaim() {
  return `${acak(4)}-${acak(4)}`;
}

/** ID checkout internal dengan 80 bit entropi. */
export function buatIdCheckout() {
  return `CHK-${new Date().getFullYear()}-${acak(16)}`;
}
