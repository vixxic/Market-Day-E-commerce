import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import { normalizeMsisdn } from "@/lib/otp/normalizeMsisdn";
import { generateOtp } from "@/lib/otp/generateOtp";
import { kirimOtpFonnte } from "@/lib/otp/fonnte";

const MAX_PER_MINUTE = 5;
const EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 3);

function hashOtp(code) {
  const salt = process.env.OTP_HASH_SALT || "marketday-otp";
  return createHash("sha256").update(salt + ":" + code).digest("hex");
}

export async function POST(request) {
  try {
    const payload = await dataJson(request);
    const orderId = (payload.orderId || payload.idPesanan || "").trim();
    const phone = (payload.phone || payload.nomorPemesan || "").trim();

    if (!orderId || !phone) {
      return Response.json(
        { error: "Order ID dan nomor pemesan wajib diisi." },
        { status: 400 },
      );
    }

    const msisdn = normalizeMsisdn(phone);
    if (!msisdn || msisdn.length < 10) {
      return Response.json({ error: "Format nomor pemesan tidak valid." }, { status: 400 });
    }

    // rate limit by phone last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseServer
      .from("otp_requests")
      .select("id", { count: "exact", head: true })
      .eq("phone", msisdn)
      .gte("created_at", oneMinuteAgo);

    if (countError) throw countError;
    if (count && count >= MAX_PER_MINUTE) {
      return Response.json(
        {
          error: `Terlalu banyak permintaan. Coba lagi setelah ${Math.ceil((60000 - (Date.now() - new Date(oneMinuteAgo).getTime())) / 1000)} detik.`,
        },
        { status: 429 },
      );
    }

    await supabaseServer.from("otp_requests").insert([
      { phone: msisdn, ip: request.headers.get("x-forwarded-for") },
    ]);

    const { data: order, error: fetchError } = await supabaseServer
      .from("orders")
      .select("id, status, nomor_pemesan")
      .eq("id_pesanan", orderId)
      .maybeSingle();

    if (fetchError || !order) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (order.status === "menunggu_konfirmasi") {
      return Response.json(
        { error: "Pesanan sudah diverifikasi." },
        { status: 400 },
      );
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseServer
      .from("orders")
      .update({
        otp_hash: hashOtp(code),
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        buyer_phone: msisdn,
      })
      .eq("id_pesanan", orderId);

    if (updateError) throw updateError;

    // send via Fonnte best-effort with promise capture
    try {
      await kirimOtpFonnte(msisdn, code);
    } catch (error) {
      console.error("Gagal kirim OTP via Fonnte:", error);
      // allow retry but notify user
      return Response.json(
        {
          success: false,
          error: "Kode OTP gagal dikirim via WhatsApp. Silakan coba lagi.",
        },
        { status: 502 },
      );
    }
    return Response.json({
      success: true,
      message: "Kode OTP sudah dikirim ke WhatsApp pemesan.",
      cooldown: 60,
    });
  } catch (error) {
    return responsGagal(error);
  }
}
