import { supabaseServer } from "@/lib/supabase/server";
import { dataJson } from "@/lib/server/tokoApi";
import { normalizeMsisdn } from "@/lib/otp/normalizeMsisdn";
import {
  POLA_UUID,
  galatValidasi,
  hargaValid,
  teksOpsional,
  teksWajib,
} from "@/lib/server/validasiInput";
import {
  buatIdCheckout,
  buatIdPesanan,
  buatKodeKlaim,
} from "@/lib/server/idPesanan";

const KOLOM_PESANAN_AMAN =
  "id, id_checkout, id_pesanan, kode_klaim, id_toko, total, status, nama_penerima, nomor_pemesan, created_at, items";

export async function POST(request) {
  try {
    const body = await dataJson(request);

    const idToko =
      typeof body.id_toko === "string" ? body.id_toko.trim() : "";
    if (!POLA_UUID.test(idToko)) {
      throw galatValidasi("Toko pesanan tidak valid.");
    }

    const namaPenerima = teksWajib(body.nama_penerima, "Nama pemesan", {
      min: 1,
      max: 80,
    });

    const nomorMentah =
      typeof body.nomor_pemesan === "string"
        ? body.nomor_pemesan.trim()
        : "";
    const msisdn = normalizeMsisdn(nomorMentah);
    if (!msisdn || msisdn.length < 10 || msisdn.length > 15) {
      throw galatValidasi(
        "Masukkan nomor pemesan yang valid (8–15 digit).",
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw galatValidasi("Pesanan tidak berisi produk.");
    }
    if (body.items.length > 50) {
      throw galatValidasi("Pesanan berisi terlalu banyak item.");
    }

    const itemMasukan = body.items.map((item) => {
      if (!item || typeof item !== "object") {
        throw galatValidasi("Item pesanan tidak valid.");
      }

      const idProduk =
        typeof item.id_produk === "string" ? item.id_produk.trim() : "";
      if (!POLA_UUID.test(idProduk)) {
        throw galatValidasi("Produk pada pesanan tidak valid.");
      }

      const jumlah = Number(item.jumlah);
      if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 99) {
        throw galatValidasi("Jumlah produk harus antara 1 dan 99.");
      }

      const varian =
        item.varian && typeof item.varian === "object" ? item.varian : {};

      return {
        idProduk,
        jumlah,
        rasa: teksOpsional(varian.rasa, "Rasa", { max: 60 }),
        ukuran: teksOpsional(varian.ukuran, "Ukuran", { max: 60 }),
      };
    });

    const idProdukUnik = [...new Set(itemMasukan.map((item) => item.idProduk))];

    const { data: toko, error: tokoError } = await supabaseServer
      .from("stores")
      .select("id, aktif")
      .eq("id", idToko)
      .maybeSingle();

    if (tokoError) throw tokoError;
    if (!toko || toko.aktif === false) {
      return Response.json(
        {
          error:
            "Toko untuk produk di keranjang sudah tidak tersedia. Kembali ke keranjang dan pilih produk yang masih tersedia.",
        },
        { status: 409 },
      );
    }

    const { data: produkTersedia, error: produkError } = await supabaseServer
      .from("products")
      .select("id, id_toko, nama, harga, gambar, gambar_list")
      .in("id", idProdukUnik);

    if (produkError) throw produkError;

    const petaProduk = new Map(
      (produkTersedia ?? []).map((produk) => [
        String(produk.id),
        produk,
      ]),
    );

    if (petaProduk.size !== idProdukUnik.length) {
      return Response.json(
        {
          error:
            "Salah satu produk sudah tidak tersedia. Kembali ke keranjang dan perbarui pesanan.",
        },
        { status: 409 },
      );
    }

    const itemServer = itemMasukan.map((item) => {
      const produk = petaProduk.get(item.idProduk);

      if (String(produk.id_toko) !== String(idToko)) {
        throw galatValidasi(
          "Satu pesanan hanya dapat berisi produk dari satu toko.",
        );
      }

      const harga = hargaValid(produk.harga, "Harga produk");
      const gambarList = Array.isArray(produk.gambar_list)
        ? produk.gambar_list.filter(
            (gambar) => typeof gambar === "string" && gambar.trim(),
          )
        : [];

      return {
        id_produk: String(produk.id),
        nama: produk.nama,
        harga,
        gambar: gambarList[0] ?? produk.gambar ?? null,
        jumlah: item.jumlah,
        subtotal: harga * item.jumlah,
        varian: {
          rasa: item.rasa,
          ukuran: item.ukuran,
        },
      };
    });

    const total = itemServer.reduce((jumlah, item) => jumlah + item.subtotal, 0);

    const pesananBaru = {
      id_checkout: buatIdCheckout(),
      id_pesanan: buatIdPesanan(),
      kode_klaim: buatKodeKlaim(),
      id_toko: idToko,
      total,
      dari_keranjang: false,
      status: "menunggu_otp",
      nama_penerima: namaPenerima,
      nomor_pemesan: nomorMentah,
      created_at: new Date().toISOString(),
      items: itemServer,
    };

    const { data, error } = await supabaseServer
      .from("orders")
      .insert([pesananBaru])
      .select(KOLOM_PESANAN_AMAN)
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    if (error?.publik) {
      return Response.json({ error: error.message }, { status: error.status ?? 400 });
    }

    console.error("Gagal membuat pesanan:", error);
    return Response.json(
      { error: "Pesanan belum berhasil dibuat. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
