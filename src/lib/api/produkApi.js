import { supabase } from "@/lib/supabase/client";

async function permintaanProduk(query, options = {}) {
  const { data, error } = await query;

  if (error) {
    const err = new Error(`Permintaan produk gagal: ${error.message}`);
    err.status = error.code || 500;
    throw err;
  }

  return data;
}

function normalisasiProduk(produk) {
  const sumberGambar =
    Array.isArray(produk.gambar_list) && produk.gambar_list.length > 0
      ? produk.gambar_list
      : produk.image ?? produk.gambar;
  const gambarList = (
    Array.isArray(sumberGambar)
      ? sumberGambar
      : typeof sumberGambar === "string"
        ? [sumberGambar]
        : []
  ).filter((gambar) => typeof gambar === "string" && gambar.trim());

  return {
    ...produk,
    gambar: gambarList[0] ?? null,
    image: gambarList,
  };
}

export async function ambilDaftarProduk({ signal } = {}) {
  const query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  const produk = await permintaanProduk(query);
  if (!Array.isArray(produk)) {
    throw new Error("Format daftar produk dari Supabase tidak valid.");
  }
  
  return produk.map(normalisasiProduk);
}

export async function ambilProdukById(id, { signal } = {}) {
  try {
    const query = supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    const p = await permintaanProduk(query);
    if (!p) return null;

    return normalisasiProduk(p);
  } catch (error) {
    if (error.status === 404 || error.message.includes('no rows')) return null;
    throw error;
  }
}

export function tambahProduk(data) {
  const query = supabase
    .from('products')
    .insert([data])
    .select();

  return permintaanProduk(query);
}

export function ubahProduk(id, data) {
  const query = supabase
    .from('products')
    .update(data)
    .eq('id', id)
    .select();

  return permintaanProduk(query);
}

export async function hapusProduk(id) {
  const query = supabase
    .from('products')
    .delete()
    .eq('id', id);

  await permintaanProduk(query);
}
