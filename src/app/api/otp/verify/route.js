import { supabaseServer } from "@/lib/supabase/server";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import { kirimPemberitahuanPesananFonnte } from "@/lib/otp/fonnte";
import { otpCocok } from "@/lib/otp/otpHash";

const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 3);

export async function POST(request) {
  try {
    const payload = await dataJson(request);
    const orderId = (payload.orderId || payload.idPesanan || "").trim();
    const otp = (payload.otp || payload.code || "").trim();

    if (!orderId || !otp) {
      return Response.json(
        { error: "Order ID dan kode OTP wajib diisi." },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return Response.json({ error: "Kode OTP harus 6 digit." }, { status: 400 });
    }

    const { data: order, error: fetchError } = await supabaseServer
      .from("orders")
      .select(
        "id, status, otp_hash, otp_expires_at, otp_attempts, id_toko, buyer_phone, nomor_pemesan, total, id_pesanan",
      )
      .eq("id_pesanan", orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!order) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const { data: toko, error: tokoError } = await supabaseServer
      .from("stores")
      .select("aktif")
      .eq("id", order.id_toko)
      .maybeSingle();

    if (tokoError) throw tokoError;
    if (!toko || toko.aktif === false) {
      return Response.json(
        { error: "Toko untuk pesanan ini sudah tidak aktif." },
        { status: 409 },
      );
    }

    if (order.status === "menunggu_konfirmasi") {
      return Response.json({
        success: true,
        status: order.status,
        message: "Pesanan sudah diverifikasi.",
      });
    }

    if (order.status !== "menunggu_otp") {
      return Response.json(
        { error: "Pesanan ini tidak sedang menunggu verifikasi OTP." },
        { status: 400 },
      );
    }

    if (!order.otp_hash || !order.otp_expires_at) {
      return Response.json(
        { error: "Belum ada kode OTP aktif. Silakan kirim ulang." },
        { status: 400 },
      );
    }

    if (new Date(order.otp_expires_at).getTime() < Date.now()) {
      return Response.json(
        { error: "Kode OTP sudah kedaluwarsa. Silakan minta kode baru." },
        { status: 400 },
      );
    }

    if (order.otp_attempts >= OTP_MAX_ATTEMPTS) {
      return Response.json(
        { error: "Percobaan OTP melebihi batas. Silakan minta kode baru." },
        { status: 429 },
      );
    }

    if (!otpCocok(orderId, otp, order.otp_hash)) {
      await supabaseServer
        .from("orders")
        .update({ otp_attempts: (order.otp_attempts || 0) + 1 })
        .eq("id", order.id)
        .eq("otp_hash", order.otp_hash);

      return Response.json(
        {
          error: "Kode OTP tidak sesuai.",
          remainingAttempts: Math.max(
            0,
            OTP_MAX_ATTEMPTS - (order.otp_attempts + 1),
          ),
        },
        { status: 400 },
      );
    }

    const verifiedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseServer
      .from("orders")
      .update({
        status: "menunggu_konfirmasi",
        otp_verified_at: verifiedAt,
        otp_hash: null,
        otp_expires_at: null,
        otp_attempts: 0,
      })
      .eq("id", order.id)
      .eq("otp_hash", order.otp_hash)
      .select("id, status, id_toko")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) {
      return Response.json(
        { error: "Kode OTP sudah berubah. Silakan coba lagi." },
        { status: 409 },
      );
    }

    // Notifikasi penjual bersifat best effort. Kode klaim tidak dikirim ke
    // WhatsApp pihak ketiga; penjual membacanya dari dashboard.
    Promise.resolve().then(async () => {
      try {
        const { data: store } = await supabaseServer
          .from("stores")
          .select("nama_toko, whatsapp_number")
          .eq("id", updated.id_toko)
          .maybeSingle();

        if (!store?.whatsapp_number) return;

        const body =
          `Pesanan Baru Market Day (OTP Terverifikasi)\n` +
          `ID Pesanan: ${order.id_pesanan}\n` +
          `Total: Rp ${order.total}\n` +
          `Pemesan: ${order.buyer_phone || order.nomor_pemesan || "-"}\n\n` +
          `Buka dashboard toko untuk melihat detail dan kode klaim.`;

        await kirimPemberitahuanPesananFonnte(store.whatsapp_number, body);
        await supabaseServer
          .from("orders")
          .update({ seller_notified_at: new Date().toISOString() })
          .eq("id_pesanan", orderId);
      } catch (e) {
        console.error("Gagal kirim notifikasi ke penjual:", e);
      }
    });

    return Response.json({
      success: true,
      status: "menunggu_konfirmasi",
      message: "Nomor OTP terverifikasi. Pesanan terkirim ke penjual.",
    });
  } catch (error) {
    return responsGagal(error);
  }
}
