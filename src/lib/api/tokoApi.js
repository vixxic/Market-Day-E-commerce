import { supabase } from "@/lib/supabase/client";

async function permintaanToko(query) {
  const { data, error } = await query;

  if (error) {
    throw new Error(`Permintaan data toko gagal: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error("Format daftar toko dari Supabase tidak valid.");
  }

  return data.map(({ id, nama_toko, aktif }) => ({ 
    id, 
    namaToko: nama_toko, 
    aktif 
  }));
}

export async function ambilDaftarToko({ signal } = {}) {
  const query = supabase
    .from('stores')
    .select('id, nama_toko, aktif')
    .eq('aktif', true);

  return permintaanToko(query);
}
