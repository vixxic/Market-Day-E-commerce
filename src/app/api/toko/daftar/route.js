import { supabaseServer } from "@/lib/supabase/server";
import { responsGagal } from "@/lib/server/tokoApi";

export async function GET(request) {
  try {
    const { data, error } = await supabaseServer
      .from('stores')
      .select('id, nama_toko, aktif')
      .eq('aktif', true);

    if (error) throw error;

    // Return in the same format the frontend expects
    return Response.json(
      data.map(({ id, nama_toko, aktif }) => ({
        id,
        namaToko: nama_toko,
        aktif: aktif !== false,
      }))
    );
  } catch (error) {
    return responsGagal(error);
  }
}
