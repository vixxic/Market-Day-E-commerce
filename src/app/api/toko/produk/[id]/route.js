import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import {
  daftarTeks,
  daftarUkuran,
  daftarUrlGambar,
  hargaValid,
  promoValid,
  stokValid,
  teksOpsional,
  teksWajib,
} from "@/lib/server/validasiInput";
import { kolomBelumAda } from "@/lib/server/kolomTabel";

// Bintang dipakai supaya kolom baru (mis. promo) tetap ikut terkirim tanpa
// membuat query gagal saat migration-nya belum diterapkan.
const KOLOM_PRODUK = "*";

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
    if ("stok" in data) {
      perubahan.stok = stokValid(data.stok);
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

    const image = data.image ?? data.gambar;
    if (image !== undefined) {
      const imageList = daftarUrlGambar(image, "Foto produk");
      perubahan.gambar = imageList[0];
      perubahan.gambar_list = imageList;
    }

    // Security Check: Ensure the product belongs to the logged-in store owner
    const { data: product, error: checkError } = await supabaseServer
      .from('products')
      .select('id_toko, harga')
      .eq('id', id)
      .single();

    if (checkError || !product) {
      return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (String(product.id_toko) !== String(toko.id)) {
      return Response.json({ error: "Anda tidak memiliki izin untuk mengubah produk ini." }, { status: 403 });
    }

    if ("ukuran" in data) {
      const ukuran = daftarUkuran(data.ukuran, "Ukuran", {
        maksItem: 10,
        maksPanjang: 40,
        hargaDasar: "harga" in data ? data.harga : product.harga,
      });

      perubahan.ukuran = ukuran;
      // Samakan harga produk dengan ukuran termurah, sama seperti POST.
      perubahan.harga =
        ukuran.length > 0
          ? Math.min(...ukuran.map((item) => item.harga))
          : hargaValid("harga" in data ? data.harga : product.harga);
    } else if ("harga" in data) {
      perubahan.harga = hargaValid(data.harga);
    }

    if ("promo" in data) {
      perubahan.promo = promoValid(data.promo);
    }

    if (Object.keys(perubahan).length === 0) {
      return Response.json({ error: "Tidak ada perubahan produk." }, { status: 400 });
    }

    let { data: updatedProduct, error: updateError } = await supabaseServer
      .from('products')
      .update(perubahan)
      .eq('id', id)
      .select(KOLOM_PRODUK)
      .single();

    // Migration promo belum diterapkan: perubahan lain tetap disimpan.
    if (updateError && kolomBelumAda(updateError) && "promo" in perubahan) {
      if (perubahan.promo) {
        return Response.json(
          {
            error:
              "Fitur promo belum aktif di database. Terapkan migration 20261102140000_add_promo_to_products.sql di Supabase, lalu coba lagi.",
          },
          { status: 503 },
        );
      }

      const tanpaPromo = { ...perubahan };
      delete tanpaPromo.promo;

      ({ data: updatedProduct, error: updateError } = await supabaseServer
        .from('products')
        .update(tanpaPromo)
        .eq('id', id)
        .select(KOLOM_PRODUK)
        .single());
    }

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
