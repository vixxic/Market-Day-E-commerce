import { ambilJsonAman, galatRamah } from "@/lib/galatRamah";

export async function buatPesanan(data) {
  return ambilJsonAman("/api/pesanan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function ambilStatusPesanan(idPesanan, kodeKlaim) {
  const parameter = new URLSearchParams({ kodeKlaim: kodeKlaim ?? "" });
  const data = await ambilJsonAman(
    `/api/pesanan/${encodeURIComponent(idPesanan)}?${parameter.toString()}`,
    { cache: "no-store" },
  );

  if (
    String(data?.idPesanan) !== String(idPesanan) ||
    typeof data?.status !== "string"
  ) {
    throw galatRamah();
  }

  return data;
}
