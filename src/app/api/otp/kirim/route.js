import { supabaseServer } from "@/lib/supabase/server";
import { responsGagal } from "@/lib/server/tokoApi";
import { normalizeMsisdn } from "@/lib/otp/normalizeMsisdn";
import { generateOtp } from "@/lib/otp/generateOtp";
import { hashOtp } from "@/lib/otp/otpHash";
import { kirimOtpFonnte } from "@/lib/otp/fonnte";
import { ambilIpKlien } from "@/lib/server/klien";

const MAX_PER_PHONE_PER_MINUTE = 5;
const MAX_PER_IP_PER_HOUR = 20;
const COOLDOWN_SECONDS = 60;
const EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
const CLEANUP_AFTER_HOURS = 24;

function sisaDetik(waktu) {
  return Math.max(
    0,
    Math.ceil((COOLDOWN_SECONDS * 1000 - (Date.now() - new Date(waktu).getTime())) / 1000),
  );
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "Isi permintaan harus berupa JSON yang valid." },
        { status: 400 },
      );
    }

    const orderId = (body.orderId || body.idPesanan || "").trim();
    const phone = (body.phone || body.nomorPemesan || "").trim();

    if (!orderId || !phone) {
      return Response.json(
        { error: "Order ID dan nomor pemesan wajib diisi." },
        { status: 400 },
      );
    }

    const msisdn = normalizeMsisdn(phone);
    if (!msisdn || msisdn.length < 10 || msisdn.length > 15) {
      return Response.json(
        { error: "Format nomor pemesan tidak valid." },
        { status: 400 },
      );
    }

    // Validasi pesanan lebih dulu supaya otp_requests tidak bisa dipakai
    // membakar kuota nomor lain atau menjadi proxy pengiriman WhatsApp.
    const { data: order, error: fetchError } = await supabaseServer
      .from("orders")
      .select("id, status, nomor_pemesan, id_toko")
      .eq("id_pesanan", orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!order) {
      return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (order.status !== "menunggu_otp") {
      return Response.json(
        { error: "Pesanan ini tidak sedang menunggu verifikasi OTP." },
        { status: 400 },
      );
    }

    const nomorPesanan = normalizeMsisdn(order.nomor_pemesan || "");
    if (!nomorPesanan || msisdn !== nomorPesanan) {
      return Response.json(
        { error: "Nomor pemesan tidak sesuai dengan pesanan ini." },
        { status: 400 },
      );
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

    const ip = ambilIpKlien(request);
    const ipTerpercaya = ip !== "lokal";

    // Cooldown per nomor (harus sama dengan nomor pada pesanan).
    const { data: terakhir, error: terakhirError } = await supabaseServer
      .from("otp_requests")
      .select("created_at")
      .eq("phone", msisdn)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (terakhirError) throw terakhirError;

    if (terakhir?.created_at) {
      const sisa = sisaDetik(terakhir.created_at);
      if (sisa > 0) {
        return Response.json(
          {
            error: `Tunggu ${sisa} detik sebelum meminta kode lagi.`,
            cooldown: sisa,
          },
          { status: 429 },
        );
      }
    }

    const satuMenitLalu = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: jumlahNomor, error: hitungError } = await supabaseServer
      .from("otp_requests")
      .select("id", { count: "exact", head: true })
      .eq("phone", msisdn)
      .gte("created_at", satuMenitLalu);

    if (hitungError) throw hitungError;

    if (jumlahNomor && jumlahNomor >= MAX_PER_PHONE_PER_MINUTE) {
      return Response.json(
        { error: "Terlalu banyak permintaan OTP. Coba lagi beberapa saat." },
        { status: 429 },
      );
    }

    if (ipTerpercaya) {
      const satuJamLalu = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: jumlahIp, error: hitungIpError } = await supabaseServer
        .from("otp_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", satuJamLalu);

      if (hitungIpError) throw hitungIpError;

      if (jumlahIp && jumlahIp >= MAX_PER_IP_PER_HOUR) {
        return Response.json(
          { error: "Terlalu banyak permintaan OTP dari jaringan ini. Coba lagi nanti." },
          { status: 429 },
        );
      }
    }

    // Catat permintaan hanya setelah pesanan dan nomor tervalidasi.
    const { data: catatan, error: catatError } = await supabaseServer
      .from("otp_requests")
      .insert([{ phone: msisdn, ip: ip.slice(0, 64) }])
      .select("id")
      .single();

    if (catatError) throw catatError;

    const code = generateOtp();
    const expiresAt = new Date(
      Date.now() + EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    const { error: updateError } = await supabaseServer
      .from("orders")
      .update({
        otp_hash: hashOtp(orderId, code),
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        buyer_phone: nomorPesanan,
      })
      .eq("id_pesanan", orderId)
      .eq("status", "menunggu_otp");

    if (updateError) throw updateError;

    try {
      await kirimOtpFonnte(nomorPesanan, code);
    } catch (error) {
      console.error("Gagal kirim OTP via Fonnte:", error);

      // Kode tidak terkirim: hapus catatan agar pengguna bisa mencoba lagi
      // tanpa terkena cooldown, lalu kosongkan hash yang belum terpakai.
      await Promise.allSettled([
        supabaseServer.from("otp_requests").delete().eq("id", catatan.id),
        supabaseServer
          .from("orders")
          .update({
            otp_hash: null,
            otp_expires_at: null,
            otp_attempts: 0,
          })
          .eq("id_pesanan", orderId),
      ]);

      return Response.json(
        {
          success: false,
          error: "Kode OTP gagal dikirim via WhatsApp. Silakan coba lagi.",
        },
        { status: 502 },
      );
    }

    // Bersihkan catatan lama agar tabel pembatas tidak tumbuh tanpa batas.
    const batasBersih = new Date(
      Date.now() - CLEANUP_AFTER_HOURS * 60 * 60 * 1000,
    ).toISOString();
    Promise.resolve()
      .then(() =>
        supabaseServer
          .from("otp_requests")
          .delete()
          .lt("created_at", batasBersih),
      )
      .catch(() => {});

    return Response.json({
      success: true,
      message: "Kode OTP sudah dikirim ke WhatsApp pemesan.",
      cooldown: COOLDOWN_SECONDS,
    });
  } catch (error) {
    return responsGagal(error);
  }
}
