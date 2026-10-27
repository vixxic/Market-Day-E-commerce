import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { responsGagal } from "@/lib/server/tokoApi";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const data = await request.json();
    const perubahan = {};
    if (typeof data.nama === "string") perubahan.nama = data.nama.trim();
    if (data.harga !== undefined) {
      const harga = Number(data.harga);
      if (!Number.isFinite(harga) || harga <= 0) {
        return Response.json({ error: "Harga produk tidak valid." }, { status: 400 });
      }
      perubahan.harga = harga;
    }
    if (Array.isArray(data.kategori)) perubahan.kategori = data.kategori;
    if (typeof data.deskripsi === "string") {
      perubahan.deskripsi = data.deskripsi.trim();
    }
    if (Array.isArray(data.rasa)) perubahan.rasa = data.rasa;
    if (Array.isArray(data.ukuran)) perubahan.ukuran = data.ukuran;
    const image = data.image ?? data.gambar;
    if (typeof image === "string" || Array.isArray(image)) {
      perubahan.gambar = Array.isArray(image) ? image[0] ?? null : image;
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

    if (product.id_toko !== toko.id) {
      return Response.json({ error: "Anda tidak memiliki izin untuk mengubah produk ini." }, { status: 403 });
    }

    const { data: updatedProduct, error: updateError } = await supabaseServer
      .from('products')
      .update(perubahan)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return Response.json(updatedProduct);
  } catch (error) {
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

    if (product.id_toko !== toko.id) {
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
