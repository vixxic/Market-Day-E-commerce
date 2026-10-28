export async function permintaanApi(url, options) {
  const respons = await fetch(url, { cache: "no-store", ...options });
  if (!respons.ok) {
    throw new Error(`Permintaan API gagal (${respons.status}).`);
  }
  if (respons.status === 204) return null;
  return respons.json();
}

export function responsGagal(error) {
  console.error(error);

  const status = Number.isInteger(error?.status) ? error.status : 500;
  const statusAman = status >= 400 && status <= 599 ? status : 500;

  // Pesan internal (Supabase, argon2, jaringan) tidak boleh sampai ke klien.
  // Hanya error validasi milik aplikasi yang aman ditampilkan.
  const amanDitampilkan = statusAman < 500 && !error?.code && error?.message;
  const pesan = amanDitampilkan
    ? error.message
    : "Terjadi kesalahan pada server. Silakan coba lagi.";

  return Response.json({ error: pesan }, { status: statusAman });
}

export async function dataJson(request) {
  try {
    return await request.json();
  } catch {
    const error = new Error("Isi permintaan harus berupa JSON yang valid.");
    error.status = 400;
    error.publik = true;
    throw error;
  }
}
