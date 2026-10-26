import { supabase } from "@/lib/supabase/client";

async function permintaanPesanan(query) {
  const { data, error } = await query;

  if (error) {
    throw new Error(`Permintaan data pesanan gagal: ${error.message}`);
  }

  return data;
}

export async function ambilPesananToko(idToko, { signal } = {}) {
  if (idToko === null || idToko === undefined || idToko === "") {
    throw new Error("ID toko diperlukan untuk mengambil pesanan toko.");
  }

  const query = supabase
    .from('orders')
    .select('*')
    .eq('id_toko', idToko)
    .order('created_at', { ascending: false });

  const daftar = await permintaanPesanan(query);
  if (!Array.isArray(daftar)) {
    throw new Error("Format daftar pesanan toko dari Supabase tidak valid.");
  }
  return daftar;
}

export async function buatPesanan(data) {
  const respons = await fetch("/api/pesanan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const dataJson = await respons.json();

  if (!respons.ok) {
    const error = new Error(
      dataJson?.error ?? `Permintaan pesanan gagal (${respons.status}).`,
    );
    error.status = respons.status;
    throw error;
  }

  if (respons.status === 204) return null;
  return dataJson;
}

export async function ambilStatusPesanan(idPesanan) {
  // Note: This still calls the local API route because it handles complex logic,
  // but the local API route itself will be migrated to Supabase next.
  const response = await fetch(
    `/api/pesanan/${encodeURIComponent(idPesanan)}`,
    { cache: "no-store" },
  );
  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? "Gagal memeriksa status pesanan.");
  }
  if (
    String(data?.idPesanan) !== String(idPesanan) ||
    typeof data.status !== "string"
  ) {
    throw new Error("Format status pesanan dari API tidak valid.");
  }
  return data;
}

export function ubahStatusPesanan(id, status) {
  const query = supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select();

  return permintaanPesanan(query);
}
