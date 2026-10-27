import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import {
  dataJson,
  responsGagal,
} from "@/lib/server/tokoApi";

export async function GET(request) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from('products')
      .select('*')
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
    const nama = typeof data.nama === "string" ? data.nama.trim() : "";
    const harga = Number(data.harga);
    const imageList = Array.isArray(data.image)
      ? data.image
          .filter((url) => typeof url === "string" && url.trim())
          .map((url) => url.trim())
      : typeof data.image === "string" && data.image.trim()
        ? [data.image.trim()]
        : [];

    if (!nama || !Number.isFinite(harga) || harga <= 0 || imageList.length === 0) {
      return Response.json(
        { error: "Nama, harga yang valid, dan foto produk wajib diisi." },
        { status: 400 },
      );
    }
    if (imageList.length > 5) {
      return Response.json(
        { error: "Pilih maksimal 5 foto produk." },
        { status: 400 },
      );
    }

    const produkBaru = {
      nama,
      harga,
      gambar: imageList[0],
      gambar_list: imageList,
      id_toko: toko.id,
      created_at: new Date().toISOString(),
      kategori: Array.isArray(data.kategori) ? data.kategori : [],
      deskripsi: typeof data.deskripsi === "string" ? data.deskripsi.trim() : "",
      rasa: Array.isArray(data.rasa) ? data.rasa : [],
      ukuran: Array.isArray(data.ukuran) ? data.ukuran : [],
    };

    const { data: result, error } = await supabaseServer
      .from('products')
      .insert([produkBaru])
      .select();

    if (error) throw error;
    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Gagal menyimpan produk:", error);
    return Response.json(
      { error: "Produk belum berhasil disimpan. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
