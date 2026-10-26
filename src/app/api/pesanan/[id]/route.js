import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "ID pesanan diperlukan." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("orders")
      .select("id, id_pesanan, status")
      .eq("id_pesanan", id)
      .single();

    if (error || !data) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    return Response.json({
      idPesanan: data.id_pesanan,
      status: data.status,
    });
  } catch (error) {
    return responsGagal(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const toko = bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const { id } = await params;

    const { data: order, error: checkError } = await supabaseServer
      .from("orders")
      .select("id, id_pesanan, status, id_toko")
      .eq("id_pesanan", id)
      .single();

    if (checkError || !order) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (String(order.id_toko) !== String(toko.id)) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const { status } = await dataJson(request);
    const transisiValid =
      status === "diproses" && order.status === "menunggu_konfirmasi";

    if (!transisiValid) {
      return Response.json(
        { error: "Status pesanan tidak dapat diubah ke status tersebut." },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabaseServer
      .from("orders")
      .update({ status })
      .eq("id_pesanan", id)
      .select()
      .single();

    if (updateError) throw updateError;
    return Response.json(updated);
  } catch (error) {
    return responsGagal(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const toko = bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const { id } = await params;

    const { data: order, error: checkError } = await supabaseServer
      .from("orders")
      .select("id, status, id_toko")
      .eq("id_pesanan", id)
      .single();

    if (checkError || !order) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (String(order.id_toko) !== String(toko.id)) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (order.status !== "diproses") {
      return Response.json(
        { error: "Hanya pesanan yang sedang diproses dapat dihapus." },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabaseServer
      .from("orders")
      .delete()
      .eq("id_pesanan", id);

    if (deleteError) throw deleteError;
    return new Response(null, { status: 204 });
  } catch (error) {
    return responsGagal(error);
  }
}
