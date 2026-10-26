import { supabaseServer } from "@/lib/supabase/server";
import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { responsGagal } from "@/lib/server/tokoApi";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const toko = bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const data = await request.json();

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
      .update(data)
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
    const toko = bacaSesiToko(request);
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
