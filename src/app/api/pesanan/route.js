import { supabaseServer } from "@/lib/supabase/server";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";

export async function POST(request) {
  try {
    const body = await dataJson(request);

    const { data, error } = await supabaseServer
      .from("orders")
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    return responsGagal(error);
  }
}
