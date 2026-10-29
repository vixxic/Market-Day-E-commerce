"use client";

import "./HeaderToko.css";
import { useEffect, useRef, useState } from "react";

export default function HeaderToko({
  judul = "Market Day",
  pencarianTerbuka = false,
  nilaiCari = "",
  onCariKlik,
  onCariUbah,
  onTokoKlik,
}) {
  const inputCariRef = useRef(null);
  const [sudahScroll, setSudahScroll] = useState(false);

  useEffect(() => {
    if (pencarianTerbuka) inputCariRef.current?.focus();
  }, [pencarianTerbuka]);

  useEffect(() => {
    function perbaruiStatusScroll() {
      setSudahScroll(window.scrollY > 8);
    }

    perbaruiStatusScroll();
    window.addEventListener("scroll", perbaruiStatusScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", perbaruiStatusScroll);
    };
  }, []);

  return (
    <header
      className={`header-toko header-toko--mobile${
        sudahScroll ? " header-toko--tergulir" : ""
      }`}
    >
      <div className="header-toko__isi">
        <h1 className="header-toko__judul">{judul}</h1>

        <div className="header-toko__aksi">
          {pencarianTerbuka && (
            <input
              ref={inputCariRef}
              id="header-toko-pencarian"
              className="header-toko__input-cari"
              type="search"
              placeholder="Cari produk..."
              aria-label="Cari produk"
              value={nilaiCari}
              onChange={(event) => onCariUbah?.(event.target.value)}
            />
          )}
          <button
            type="button"
            className="header-toko__tombol header-toko__tombol--cari"
            aria-label={pencarianTerbuka ? "Tutup pencarian" : "Cari produk"}
            aria-expanded={pencarianTerbuka}
            aria-controls={
              pencarianTerbuka ? "header-toko-pencarian" : undefined
            }
            onClick={onCariKlik}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="10.5" cy="10.5" r="7.5" />
              <path d="M16.2 16.2 21.5 21.5" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
