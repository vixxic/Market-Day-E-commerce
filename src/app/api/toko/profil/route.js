import { bacaSesiToko } from "@/lib/server/tokoAuth";
import { supabaseServer } from "@/lib/supabase/server";
import { dataJson, responsGagal } from "@/lib/server/tokoApi";
import { ambilProfilToko } from "@/lib/server/profilToko";
import {
  teksOpsional,
  urlGambarAman,
} from "@/lib/server/validasiInput";

async function bacaToko(tokoId) {
  const { data, error } = await supabaseServer
    .from("stores")
    .select("id, nama_toko, whatsapp_number, created_at")
    .eq("id", tokoId)
    .maybeSingle();

  if (error) throw error;

  const { profil, tersedia } = await ambilProfilToko(tokoId);

  return {
    toko: {
      id: String(data.id),
      namaToko: data.nama_toko,
      whatsappNumber: data.whatsapp_number ?? null,
      createdAt: data.created_at ?? null,
      ...profil,
    },
    profilTersedia: tersedia,
  };
}

export async function GET(request) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    return Response.json(await bacaToko(toko.id));
  } catch (error) {
    return responsGagal(error);
  }
}

export async function PATCH(request) {
  try {
    const toko = await bacaSesiToko(request);
    if (!toko) {
      return Response.json({ error: "Login toko diperlukan." }, { status: 401 });
    }

    const data = await dataJson(request);
    const perubahan = {};

    if ("deskripsi" in data) {
      perubahan.deskripsi = teksOpsional(data.deskripsi, "Deskripsi", {
        max: 600,
      });
    }
    if ("lokasi" in data) {
      perubahan.lokasi = teksOpsional(data.lokasi, "Lokasi", { max: 120 });
    }
    if ("whatsappNumber" in data) {
      perubahan.whatsapp_number = teksOpsional(
        data.whatsappNumber ?? "",
        "Nomor WhatsApp",
        { max: 30 },
      );
    }
    if ("fotoProfil" in data) {
      perubahan.foto_profil = urlGambarAman(
        data.fotoProfil,
        "Foto profil",
      );
    }
    if ("banner" in data) {
      perubahan.banner = urlGambarAman(data.banner, "Banner");
    }

    if (Object.keys(perubahan).length === 0) {
      return Response.json(
        { error: "Tidak ada data profil yang diperbarui." },
        { status: 400 },
      );
    }

    perubahan.updated_at = new Date().toISOString();

    const { error } = await supabaseServer
      .from("stores")
      .update(perubahan)
      .eq("id", toko.id);

    if (error) {
      console.error("Gagal menyimpan profil toko:", error);
      const kolomBelumAda =
        error.code === "42703" ||
        error.code === "PGRST204" ||
        /column .* does not exist/i.test(error.message ?? "");

      return Response.json(
        {
          error: kolomBelumAda
            ? "Fitur profil toko belum aktif. Jalankan migrasi supabase/migrations/20261028120000_add_store_profiles_and_analytics.sql terlebih dahulu."
            : "Profil toko belum berhasil disimpan. Coba lagi.",
        },
        { status: 400 },
      );
    }

    return Response.json(await bacaToko(toko.id));
  } catch (error) {
    if (error.status === 400) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return responsGagal(error);
  }
}
