import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";

export async function PATCH(request, { params }) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify ownership and current status
    const { data: order, error: checkError } = await supabaseServer
      .from('orders')
      .select('id, status, id_toko')
      .eq('id', id)
      .single();

    if (checkError || !order) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (String(order.id_toko) !== String(toko.id)) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const { status } = await dataJson(request);
    const transisiValid =
      (status === "diproses" && order.status === "menunggu_konfirmasi") ||
      (status === "selesai" && order.status === "diproses") ||
      (status === "ditolak" && order.status === "menunggu_konfirmasi") ||
      (status === "dibatalkan" && order.status === "diproses");

    if (!transisiValid) {
      return Response.json(
        { error: "Status pesanan tidak dapat diubah ke status tersebut." },
        { status: 400 },
      );
    }

    if (status === "ditolak" || status === "dibatalkan") {
      const { data: berhasil, error: statusError } = await supabaseServer.rpc(
        "tolak_atau_batalkan_pesanan",
        {
          p_order_id: order.id,
          p_id_toko: toko.id,
          p_status: status,
        },
      );
      if (statusError) {
        if (["PGRST202", "42883"].includes(statusError.code)) {
          console.error(
            "Fungsi tolak_atau_batalkan_pesanan belum tersedia. Terapkan migration 20261030120000_restore_stock_on_order_rejection.sql.",
            statusError,
          );
          return Response.json(
            {
              error:
                "Fitur ini belum aktif di database. Terapkan migration 20261030120000_restore_stock_on_order_rejection.sql di Supabase, lalu coba lagi.",
            },
            { status: 503 },
          );
        }
        throw statusError;
      }
      if (!berhasil) {
        return Response.json(
          { error: "Status pesanan berubah. Muat ulang lalu coba lagi." },
          { status: 409 },
        );
      }

      const { data: updated, error: updateError } = await supabaseServer
        .from("orders")
        .select(
          "id, id_pesanan, kode_klaim, id_toko, total, status, nama_penerima, nomor_pemesan, created_at, updated_at, items",
        )
        .eq("id", id)
        .single();
      if (updateError) throw updateError;
      return Response.json(updated);
    }

    const { data: updated, error: updateError } = await supabaseServer
      .from('orders')
      .update({ status })
      .eq('id', id)
      .eq("status", order.status)
      .select('id, id_pesanan, kode_klaim, id_toko, total, status, nama_penerima, nomor_pemesan, created_at, updated_at, items')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) {
      return Response.json(
        { error: "Status pesanan berubah. Muat ulang lalu coba lagi." },
        { status: 409 },
      );
    }
    return Response.json(updated);
  } catch (error) {
    return responsGagal(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const { id } = await params;

    const { data: order, error: checkError } = await supabaseServer
      .from('orders')
      .select('id, status, id_toko')
      .eq('id', id)
      .single();

    if (checkError || !order) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (String(order.id_toko) !== String(toko.id)) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (!["ditolak", "dibatalkan"].includes(order.status)) {
      return Response.json(
        {
          error:
            "Pesanan yang sudah diterima tidak dapat dihapus. Tandai selesai agar masuk riwayat.",
        },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabaseServer
      .from('orders')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    return new Response(null, { status: 204 });
  } catch (error) {
    return responsGagal(error);
  }
}
