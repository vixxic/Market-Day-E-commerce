import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { supabaseServer } from "@/lib/supabase/server";
import { responsGagal } from "@/lib/server/tokoApi";

export async function GET(request) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }
    
    const { data, error } = await supabaseServer
      .from('orders')
      .select('id, id_checkout, id_pesanan, kode_klaim, id_toko, total, dari_keranjang, status, nama_penerima, nomor_pemesan, created_at, updated_at, items')
      .eq('id_toko', toko.id)
      .neq('status', 'menunggu_otp')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return Response.json(data);
  } catch (error) {
    return responsGagal(error);
  }
}
