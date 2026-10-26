import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { supabaseServer } from "@/lib/supabase/server";
import { responsGagal } from "@/lib/server/tokoApi";

export async function GET(request) {
  try {
    const toko = bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }
    
    const { data, error } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('id_toko', toko.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return Response.json(data);
  } catch (error) {
    return responsGagal(error);
  }
}
