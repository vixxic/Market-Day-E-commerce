function wajibUrlApi(nama, nilai) {
  if (!nilai) {
    throw new Error(`${nama} wajib diatur di .env.local.`);
  }

  let url;
  try {
    url = new URL(nilai);
  } catch {
    throw new Error(`${nama} harus berisi URL yang valid.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${nama} harus menggunakan protokol HTTP atau HTTPS.`);
  }

  return url.toString().replace(/\/$/, "");
}

export const URL_TOKO = wajibUrlApi(
  "NEXT_PUBLIC_API_TOKO_URL",
  process.env.NEXT_PUBLIC_API_TOKO_URL,
);
export const URL_PRODUK = wajibUrlApi(
  "NEXT_PUBLIC_API_PRODUK_URL",
  process.env.NEXT_PUBLIC_API_PRODUK_URL,
);
export const URL_PESANAN = wajibUrlApi(
  "NEXT_PUBLIC_API_PESANAN_URL",
  process.env.NEXT_PUBLIC_API_PESANAN_URL,
);
