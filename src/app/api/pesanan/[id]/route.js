import { supabaseServer } from "@/lib/supabase/server";

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "ID pesanan diperlukan." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    return Response.json({
      idPesanan: data.id,
      status: data.status,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Gagal memeriksa status pesanan." },
      { status: 502 },
    );
  }
}
