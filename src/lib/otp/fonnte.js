const FONNTE_ENDPOINT = "https://api.fonnte.com/send";

export async function kirimWaFonnte(target, message) {
  const token = process.env.FONNTE_API;
  if (!token) {
    throw new Error("Konfigurasi FONNTE_API belum diatur di .env");
  }

  const formData = new FormData();
  formData.set("target", target);
  formData.set("message", message);

  const response = await fetch(FONNTE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: formData,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json?.status) {
    throw new Error(
      json?.reason || json?.message || `Gagal mengirim via Fonnte (HTTP ${response.status})`,
    );
  }
  return json;
}

export async function kirimOtpFonnte(target, code) {
  return kirimWaFonnte(
    target,
    `Kode OTP Market Day: ${code}. Berlaku 5 menit. Jangan bagikan kode ini ke siapapun.`,
  );
}

export async function kirimPemberitahuanPesananFonnte(target, ringkasan) {
  return kirimWaFonnte(target, ringkasan);
}
