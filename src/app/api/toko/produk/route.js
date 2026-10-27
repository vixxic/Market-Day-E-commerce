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
    
    // Normalize data before sending to client
    const normalizedData = data.map(p => ({
      ...p,
      gambar: Array.isArray(p.gambar) ? p.gambar[0] : p.gambar,
      image: Array.isArray(p.gambar) ? p.gambar[0] : p.gambar
    }));
    
    return Response.json(normalizedData);
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
    const image = data.image;

    if (!nama || !Number.isFinite(harga) || harga <= 0 || !image) {
      return Response.json(
        { error: "Nama, harga yang valid, dan foto produk wajib diisi." },
        { status: 400 },
      );
    }

    const produkBaru = {
      nama,
      harga,
      gambar: typeof image === 'string' ? image : (Array.isArray(image) ? image[0] : null),
      kategori: Array.isArray(data.kategori) ? data.kategori : [],
      deskripsi: typeof data.deskripsi === "string" ? data.deskripsi.trim() : "",
      rasa: Array.isArray(data.rasa) ? data.rasa : [],
      ukuran: Array.isArray(data.ukuran) ? data.ukuran : [],
      id_toko: toko.id,
      created_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabaseServer
      .from('products')
      .insert([produkBaru])
      .select();

    if (error) throw error;

    return Response.json(result[0], { status: 201 });
  } catch (error) {
    return responsGagal(error);
  }
}
