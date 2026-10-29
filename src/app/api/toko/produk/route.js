import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import {
  dataJson,
  responsGagal,
} from "@/lib/server/tokoApi";
import {
  daftarTeks,
  daftarUrlGambar,
  hargaValid,
  stokValid,
  teksOpsional,
  teksWajib,
} from "@/lib/server/validasiInput";

const KOLOM_PRODUK =
  "id, nama, harga, stok, gambar, gambar_list, id_toko, created_at, updated_at, deskripsi, kategori, rasa, ukuran";

export async function GET(request) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from('products')
      .select(KOLOM_PRODUK)
      .eq('id_toko', toko.id);

    if (error) throw error;

    const dataNormalized = data.map((produk) => {
      const gambarList =
        Array.isArray(produk.gambar_list) && produk.gambar_list.length > 0
          ? produk.gambar_list
          : Array.isArray(produk.gambar)
            ? produk.gambar
            : produk.gambar
              ? [produk.gambar]
              : [];

      return {
        ...produk,
        gambar: gambarList[0] ?? null,
        image: gambarList,
      };
    });

    return Response.json(dataNormalized);
  } catch (error) {
    return responsGagal(error);
  }
}

export async function POST(request) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const data = await dataJson(request);
    const nama = teksWajib(data.nama, "Nama produk", { min: 1, max: 100 });
    const harga = hargaValid(data.harga);
    const stok = stokValid(data.stok);
    const imageList = daftarUrlGambar(data.image, "Foto produk");

    const produkBaru = {
      nama,
      harga,
      stok,
      gambar: imageList[0],
      gambar_list: imageList,
      id_toko: toko.id,
      created_at: new Date().toISOString(),
      kategori: daftarTeks(data.kategori, "Kategori", {
        maksItem: 10,
        maksPanjang: 40,
      }),
      deskripsi:
        teksOpsional(data.deskripsi, "Deskripsi", { max: 2000 }) ?? "",
      rasa: daftarTeks(data.rasa, "Rasa", {
        maksItem: 10,
        maksPanjang: 40,
      }),
      ukuran: daftarTeks(data.ukuran, "Ukuran", {
        maksItem: 10,
        maksPanjang: 40,
      }),
    };

    const { data: result, error } = await supabaseServer
      .from('products')
      .insert([produkBaru])
      .select(KOLOM_PRODUK);

    if (error) throw error;
    return Response.json(result[0], { status: 201 });
  } catch (error) {
    if (error?.publik) {
      return Response.json(
        { error: error.message },
        { status: error.status ?? 400 },
      );
    }

    console.error("Gagal menyimpan produk:", error);
    return Response.json(
      { error: "Produk belum berhasil disimpan. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
