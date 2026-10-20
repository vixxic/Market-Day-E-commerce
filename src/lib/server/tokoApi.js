export const URL_TOKO =
  "https://6ad62c7ef71f154ac48697fd.mockapi.io/Tokomarketday";
export const URL_PRODUK =
  "https://6ab5239024ee9d3caa1c3b25.mockapi.io/produk";
export const URL_PESANAN =
  "https://6ad62c7ef71f154ac48697fd.mockapi.io/pesananmarketday";

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
  return Response.json({ error: error.message }, { status: 400 });
}

export async function dataJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Isi permintaan harus berupa JSON yang valid.");
  }
}
