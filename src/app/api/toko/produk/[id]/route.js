import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import {
  daftarTeks,
  daftarUrlGambar,
  hargaValid,
  teksOpsional,
  teksWajib,
} from "@/lib/server/validasiInput";

const KOLOM_PRODUK =
  "id, nama, harga, gambar, gambar_list, id_toko, created_at, updated_at, deskripsi, kategori, rasa, ukuran";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const data = await dataJson(request);
    const perubahan = {};

    if ("nama" in data) {
      perubahan.nama = teksWajib(data.nama, "Nama produk", {
        min: 1,
        max: 100,
      });
    }
    if ("harga" in data) {
      perubahan.harga = hargaValid(data.harga);
    }
    if ("kategori" in data) {
      perubahan.kategori = daftarTeks(data.kategori, "Kategori", {
        maksItem: 10,
        maksPanjang: 40,
      });
    }
    if ("deskripsi" in data) {
      perubahan.deskripsi =
        teksOpsional(data.deskripsi, "Deskripsi", { max: 2000 }) ?? "";
    }
    if ("rasa" in data) {
      perubahan.rasa = daftarTeks(data.rasa, "Rasa", {
        maksItem: 10,
        maksPanjang: 40,
      });
    }
    if ("ukuran" in data) {
      perubahan.ukuran = daftarTeks(data.ukuran, "Ukuran", {
        maksItem: 10,
        maksPanjang: 40,
      });
    }

    const image = data.image ?? data.gambar;
    if (image !== undefined) {
      const imageList = daftarUrlGambar(image, "Foto produk");
      perubahan.gambar = imageList[0];
      perubahan.gambar_list = imageList;
    }

    if (Object.keys(perubahan).length === 0) {
      return Response.json({ error: "Tidak ada perubahan produk." }, { status: 400 });
    }

    // Security Check: Ensure the product belongs to the logged-in store owner
    const { data: product, error: checkError } = await supabaseServer
      .from('products')
      .select('id_toko')
      .eq('id', id)
      .single();

    if (checkError || !product) {
      return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (String(product.id_toko) !== String(toko.id)) {
      return Response.json({ error: "Anda tidak memiliki izin untuk mengubah produk ini." }, { status: 403 });
    }

    const { data: updatedProduct, error: updateError } = await supabaseServer
      .from('products')
      .update(perubahan)
      .eq('id', id)
      .select(KOLOM_PRODUK)
      .single();

    if (updateError) throw updateError;

    return Response.json(updatedProduct);
  } catch (error) {
    if (error?.publik) {
      return Response.json(
        { error: error.message },
        { status: error.status ?? 400 },
      );
    }
    return responsGagal(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    // Security Check: Ensure the product belongs to the logged-in store owner
    const { data: product, error: checkError } = await supabaseServer
      .from('products')
      .select('id_toko')
      .eq('id', id)
      .single();

    if (checkError || !product) {
      return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (String(product.id_toko) !== String(toko.id)) {
      return Response.json({ error: "Anda tidak memiliki izin untuk menghapus produk ini." }, { status: 403 });
    }

    const { error: deleteError } = await supabaseServer
      .from('products')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return Response.json({ message: "Produk berhasil dihapus." });
  } catch (error) {
    return responsGagal(error);
  }
}
