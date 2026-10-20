"use client";

import "./GaleriProduk.css";
import { useEffect, useRef, useState } from "react";

/**
 * Foto produk yang bisa digeser. Titik pagination hanya muncul
 * kalau jumlah foto lebih dari 1.
 *
 * Props:
 * - gambar : array URL gambar, contoh ["/products/a.jpg", "/products/b.jpg"]
 * - nama   : nama produk (untuk teks alt)
 */
export default function GaleriProduk({ gambar = [], nama }) {
  const jalurRef = useRef(null);
  const indeksAktifRef = useRef(0);
  const [indeksAktif, setIndeksAktif] = useState(0);
  const [dijeda, setDijeda] = useState(false);
  const banyakFoto = gambar.length > 1;

  function saatDigeser() {
    const jalur = jalurRef.current;
    if (!jalur || !jalur.clientWidth) return;
    const indeks = Math.round(jalur.scrollLeft / jalur.clientWidth);
    indeksAktifRef.current = indeks;
    setIndeksAktif(indeks);
  }

  function keFoto(indeks) {
    const jalur = jalurRef.current;
    if (!jalur) return;
    indeksAktifRef.current = indeks;
    setIndeksAktif(indeks);
    const kurangiGerak = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    jalur.scrollTo({
      left: indeks * jalur.clientWidth,
      behavior: kurangiGerak ? "auto" : "smooth",
    });
  }

  useEffect(() => {
    if (!banyakFoto || dijeda) return undefined;

    const timer = window.setInterval(() => {
      const indeksBerikutnya = (indeksAktifRef.current + 1) % gambar.length;
      const jalur = jalurRef.current;
      if (!jalur) return;

      indeksAktifRef.current = indeksBerikutnya;
      setIndeksAktif(indeksBerikutnya);
      const kurangiGerak = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      jalur.scrollTo({
        left: indeksBerikutnya * jalur.clientWidth,
        behavior: kurangiGerak ? "auto" : "smooth",
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [banyakFoto, dijeda, gambar.length]);

  function saatTombolDitekan(e) {
    if (!banyakFoto) return;
    if (e.key === "ArrowRight" && indeksAktif < gambar.length - 1) {
      e.preventDefault();
      keFoto(indeksAktif + 1);
    }
    if (e.key === "ArrowLeft" && indeksAktif > 0) {
      e.preventDefault();
      keFoto(indeksAktif - 1);
    }
  }

  return (
    <div className="galeri-produk">
      <div
        ref={jalurRef}
        className="galeri-produk__jalur"
        onScroll={saatDigeser}
        onKeyDown={saatTombolDitekan}
        onMouseEnter={() => setDijeda(true)}
        onMouseLeave={() => setDijeda(false)}
        onFocus={() => setDijeda(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDijeda(false);
          }
        }}
        tabIndex={banyakFoto ? 0 : undefined}
        role={banyakFoto ? "group" : undefined}
        aria-roledescription={banyakFoto ? "carousel" : undefined}
        aria-label={banyakFoto ? `Foto ${nama}` : undefined}
      >
        {gambar.length === 0 && <div className="galeri-produk__slide" />}

        {gambar.map((src, i) => (
          <div className="galeri-produk__slide" key={src + i}>
            <img
              className="galeri-produk__foto"
              src={src}
              alt={`${nama} (foto ${i + 1} dari ${gambar.length})`}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {banyakFoto && (
        <div className="galeri-produk__titik-wadah">
          {gambar.map((_, i) => (
            <button
              key={i}
              type="button"
              className={
                "galeri-produk__titik" +
                (i === indeksAktif ? " galeri-produk__titik--aktif" : "")
              }
              aria-label={`Foto ${i + 1} dari ${gambar.length}`}
              aria-current={i === indeksAktif ? "true" : undefined}
              onClick={() => keFoto(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
