import { supabaseServer } from "@/lib/supabase/server";
import { kirimPemberitahuanPesananFonnte } from "@/lib/otp/fonnte";

export function jadwalkanPemberitahuanPesanan(order) {
  Promise.resolve().then(async () => {
    try {
      const { data: store } = await supabaseServer
        .from("stores")
        .select("whatsapp_number")
        .eq("id", order.id_toko)
        .maybeSingle();

      if (!store?.whatsapp_number) return;

      const body =
        `Pesanan Baru Tribiz Fest\n` +
        `ID Pesanan: ${order.id_pesanan}\n` +
        `Total: Rp ${order.total}\n` +
        `Pemesan: ${order.buyer_phone || order.nomor_pemesan || "-"}\n\n` +
        `Buka dashboard toko untuk melihat detail dan kode klaim.`;

      await kirimPemberitahuanPesananFonnte(store.whatsapp_number, body);
      await supabaseServer
        .from("orders")
        .update({ seller_notified_at: new Date().toISOString() })
        .eq("id_pesanan", order.id_pesanan);
    } catch (error) {
      console.error("Gagal kirim notifikasi pesanan ke penjual:", error);
    }
  });
}
