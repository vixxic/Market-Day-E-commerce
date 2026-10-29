import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import { ambilIpKlien } from "@/lib/server/klien";
import { tambahHit } from "@/lib/server/rateLimitMemori";
import { bandingKonstan } from "@/lib/server/validasiInput";

const KOLOM_PESANAN_AMAN =
  "id, id_pesanan, kode_klaim, id_toko, total, status, nama_penerima, nomor_pemesan, created_at, updated_at, items";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "ID pesanan diperlukan." }, { status: 400 });
  }

  const batas = tambahHit(`status-pesanan:${ambilIpKlien(request)}`, 60, 60_000);
  if (!batas.boleh) {
    return Response.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429 },
    );
  }

  const kodeKlaim = (
    new URL(request.url).searchParams.get("kodeKlaim") ?? ""
  )
    .trim()
    .toUpperCase();

  if (!kodeKlaim) {
    return Response.json(
      { error: "Kode klaim diperlukan untuk melihat status pesanan." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await supabaseServer
      .from("orders")
      .select("id, id_pesanan, status, kode_klaim")
      .eq("id_pesanan", id)
      .maybeSingle();

    if (error) throw error;

    const kodeTersimpan = String(data?.kode_klaim ?? "").toUpperCase();
    if (!data || !bandingKonstan(kodeKlaim, kodeTersimpan)) {
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
    const toko = await bacaSesiToko(request);
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
      (status === "diproses" && order.status === "menunggu_konfirmasi") ||
      (status === "selesai" && order.status === "diproses");

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
      .select(KOLOM_PESANAN_AMAN)
      .single();

    if (updateError) throw updateError;
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
      .from("orders")
      .delete()
      .eq("id_pesanan", id);

    if (deleteError) throw deleteError;
    return new Response(null, { status: 204 });
  } catch (error) {
    return responsGagal(error);
  }
}
