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

export async function ambilStatusPesanan(idPesanan, kodeKlaim) {
  const parameter = new URLSearchParams({ kodeKlaim: kodeKlaim ?? "" });
  const response = await fetch(
    `/api/pesanan/${encodeURIComponent(idPesanan)}?${parameter.toString()}`,
    { cache: "no-store" },
  );
  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error ?? "Gagal memeriksa status pesanan.",
    );
    error.status = response.status;
    throw error;
  }
  if (
    String(data?.idPesanan) !== String(idPesanan) ||
    typeof data.status !== "string"
  ) {
    throw new Error("Format status pesanan dari API tidak valid.");
  }
  return data;
}
