"use client";

import { useState } from "react";
import { FiInfo, FiX } from "react-icons/fi";
import "./PemberitahuanOtpNonaktif.css";

export default function PemberitahuanOtpNonaktif() {
  const [terbuka, setTerbuka] = useState(true);

  if (!terbuka) return null;

  return (
    <aside
      className="pemberitahuan-otp"
      role="status"
      aria-live="polite"
      aria-labelledby="pemberitahuan-otp-judul"
    >
      <span className="pemberitahuan-otp__ikon" aria-hidden="true">
        <FiInfo />
      </span>
      <div className="pemberitahuan-otp__isi">
        <strong id="pemberitahuan-otp-judul">
          Verifikasi OTP sementara dinonaktifkan
        </strong>
        <p>
          Karena kendala teknis, pemesanan saat ini tidak memerlukan kode OTP.
          Anda tetap bisa melanjutkan pesanan seperti biasa. Mohon maaf atas
          ketidaknyamanannya.
        </p>
      </div>
      <button
        type="button"
        className="pemberitahuan-otp__tutup"
        onClick={() => setTerbuka(false)}
        aria-label="Tutup pemberitahuan"
      >
        <FiX aria-hidden="true" />
      </button>
    </aside>
  );
}
