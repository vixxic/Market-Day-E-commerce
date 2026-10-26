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

export async function ambilDaftarProduk({ signal } = {}) {
  const query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  const produk = await permintaanProduk(query);
  if (!Array.isArray(produk)) {
    throw new Error("Format daftar produk dari Supabase tidak valid.");
  }
  
  // Normalize: Ensure 'gambar' is always a string, and provide 'image' alias
  return produk.map(p => ({
    ...p,
    gambar: Array.isArray(p.gambar) ? p.gambar[0] : p.gambar,
    image: Array.isArray(p.gambar) ? p.gambar[0] : p.gambar
  }));
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

    return {
      ...p,
      gambar: Array.isArray(p.gambar) ? p.gambar[0] : p.gambar,
      image: Array.isArray(p.gambar) ? p.gambar[0] : p.gambar
    };
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
