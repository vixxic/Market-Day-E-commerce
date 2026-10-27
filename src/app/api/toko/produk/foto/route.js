import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { bacaSesiToko } from "@/lib/server/tokoAuth";

const BATAS_UKURAN_FOTO = 5 * 1024 * 1024;
const EKSTENSI_FOTO = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request) {
  const toko = await bacaSesiToko(request);
  if (!toko) {
    return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Form unggah foto tidak valid." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Pilih foto produk." }, { status: 400 });
  }

  const ekstensi = EKSTENSI_FOTO[file.type];
  if (!ekstensi) {
    return Response.json(
      { error: "Format foto harus JPG, PNG, WebP, atau AVIF." },
      { status: 400 },
    );
  }

  if (file.size > BATAS_UKURAN_FOTO) {
    return Response.json(
      { error: "Ukuran foto maksimal 5 MB." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const konfigurasiKurang = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
    ["SUPABASE_STORAGE_BUCKET", bucket],
  ]
    .filter(([, nilai]) => !nilai)
    .map(([nama]) => nama);

  if (konfigurasiKurang.length > 0) {
    const pesan = `Konfigurasi Supabase Storage belum lengkap. Atur ${konfigurasiKurang.join(", ")} di .env.local.`;
    console.error(pesan);
    return Response.json(
      { error: pesan },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const namaFile = `${encodeURIComponent(String(toko.id))}/${randomUUID()}.${ekstensi}`;
  const { error } = await supabase.storage.from(bucket).upload(namaFile, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("Gagal mengunggah foto produk ke Supabase Storage:", error);
    return Response.json(
      { error: "Gagal mengunggah foto produk. Coba lagi." },
      { status: 502 },
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(namaFile);
  return Response.json({ url: data.publicUrl }, { status: 201 });
}
