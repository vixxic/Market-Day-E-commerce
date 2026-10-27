import { createHash, timingSafeEqual } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import { kirimPemberitahuanPesananFonnte } from "@/lib/otp/fonnte";

const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 3);

function hashOtp(code) {
  const salt = process.env.OTP_HASH_SALT || "marketday-otp";
  return createHash("sha256").update(salt + ":" + code).digest("hex");
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

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
      .select("id, status, otp_hash, otp_expires_at, otp_attempts, id_toko, buyer_phone, total, id_pesanan, kode_klaim")
      .eq("id_pesanan", orderId)
      .maybeSingle();

    if (fetchError || !order) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (order.status === "menunggu_konfirmasi") {
      return Response.json({
        success: true,
        status: order.status,
        message: "Pesanan sudah diverifikasi.",
      });
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

    const expected = hashOtp(otp);
    const success = safeEqual(expected, order.otp_hash);

    if (!success) {
      await supabaseServer
        .from("orders")
        .update({ otp_attempts: (order.otp_attempts || 0) + 1 })
        .eq("id_pesanan", orderId);

      return Response.json(
        {
          error: "Kode OTP tidak sesuai.",
          remainingAttempts: Math.max(0, OTP_MAX_ATTEMPTS - (order.otp_attempts + 1)),
        },
        { status: 400 },
      );
    }

    // Success: verification
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
      .eq("id_pesanan", orderId)
      .select("id, status, id_toko")
      .single();

    if (updateError) throw updateError;

    // Trigger seller notification (best effort, fire-and-forget)
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
          `Kode Klaim: ${order.kode_klaim}\n` +
          `ID Pesanan: ${order.id_pesanan}\n` +
          `Total: Rp ${order.total}\n` +
          `Pemesan: ${order.buyer_phone || "-"}\n\n` +
          `Silakan cek halaman klaim toko Anda.`;

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
