"use client";

import { useEffect, useRef } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import "./PopupKonfirmasi.css";

export default function PopupKonfirmasi({
  buka,
  judul = "Yakin menyelesaikan pesanan?",
  pesan = "Pesanan akan ditandai selesai. Tindakan ini tidak dapat dibatalkan.",
  teksKonfirmasi = "Ya, selesaikan",
  teksBatal = "Batal",
  memproses = false,
  onKonfirmasi,
  onBatal,
}) {
  const tombolBatalRef = useRef(null);
  const onBatalRef = useRef(onBatal);

  useEffect(() => {
    onBatalRef.current = onBatal;
  }, [onBatal]);

  useEffect(() => {
    if (!buka) return undefined;

    const overflowSebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tombolBatalRef.current?.focus();

    function tekanTombol(event) {
      if (event.key === "Escape" && !memproses) onBatalRef.current?.();
    }

    document.addEventListener("keydown", tekanTombol);
    return () => {
      document.body.style.overflow = overflowSebelumnya;
      document.removeEventListener("keydown", tekanTombol);
    };
  }, [buka, memproses]);

  if (!buka) return null;

  function batalJikaBisa() {
    if (!memproses) onBatal?.();
  }

  return (
    <div
      className="popup-konfirmasi__latar"
      onClick={batalJikaBisa}
    >
      <div
        className="popup-konfirmasi"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="popup-konfirmasi-judul"
        aria-describedby="popup-konfirmasi-pesan"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="popup-konfirmasi__ikon" aria-hidden="true">
          <FiAlertTriangle />
        </span>

        <h2 className="popup-konfirmasi__judul" id="popup-konfirmasi-judul">
          {judul}
        </h2>
        <p className="popup-konfirmasi__pesan" id="popup-konfirmasi-pesan">
          {pesan}
        </p>

        <div className="popup-konfirmasi__aksi">
          <button
            type="button"
            ref={tombolBatalRef}
            className="popup-konfirmasi__tombol popup-konfirmasi__tombol--batal"
            onClick={onBatal}
            disabled={memproses}
          >
            {teksBatal}
          </button>
          <button
            type="button"
            className="popup-konfirmasi__tombol popup-konfirmasi__tombol--ya"
            onClick={onKonfirmasi}
            disabled={memproses}
          >
            {memproses ? "Memproses..." : teksKonfirmasi}
          </button>
        </div>
      </div>
    </div>
  );
}
