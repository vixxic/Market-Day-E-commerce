"use client";

import "./GaleriProduk.css";
import { useEffect, useRef, useState } from "react";

/**
 * Foto produk yang bisa digeser. Thumbnail hanya muncul kalau jumlah foto
 * lebih dari 1.
 *
 * Props:
 * - gambar  : array URL gambar, contoh ["/products/a.jpg", "/products/b.jpg"]
 * - nama    : nama produk (untuk teks alt)
 * - otomatis: geser otomatis setiap 2 detik (default true)
 */
export default function GaleriProduk({ gambar = [], nama, otomatis = true }) {
  const fotoList = Array.isArray(gambar) ? gambar : gambar ? [gambar] : [];
  const jalurRef = useRef(null);
  const indeksAktifRef = useRef(0);
  const [indeksAktif, setIndeksAktif] = useState(0);
  const [dijeda, setDijeda] = useState(false);
  const banyakFoto = fotoList.length > 1;

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
    if (!otomatis || !banyakFoto || dijeda) return undefined;

    const timer = window.setInterval(() => {
      const indeksBerikutnya = (indeksAktifRef.current + 1) % fotoList.length;
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
  }, [otomatis, banyakFoto, dijeda, fotoList.length]);

  function saatTombolDitekan(e) {
    if (!banyakFoto) return;
    if (e.key === "ArrowRight" && indeksAktif < fotoList.length - 1) {
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
      <div className="galeri-produk__bingkai">
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
          {fotoList.length === 0 && (
            <div className="galeri-produk__slide galeri-produk__slide--kosong">
              <span>Foto belum tersedia</span>
            </div>
          )}

          {fotoList.map((src, i) => (
            <div className="galeri-produk__slide" key={src + i}>
              <img
                className="galeri-produk__foto"
                src={src}
                alt={`${nama} (foto ${i + 1} dari ${fotoList.length})`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {banyakFoto && (
          <span className="galeri-produk__penghitung" aria-hidden="true">
            {indeksAktif + 1}/{fotoList.length}
          </span>
        )}
      </div>

      {banyakFoto && (
        <div className="galeri-produk__thumbnail" aria-label="Pilih foto produk">
          {fotoList.map((src, i) => (
            <button
              key={`thumb-${src}-${i}`}
              type="button"
              className={
                "galeri-produk__thumbnail-tombol" +
                (i === indeksAktif
                  ? " galeri-produk__thumbnail-tombol--aktif"
                  : "")
              }
              aria-label={`Tampilkan foto ${i + 1}`}
              aria-current={i === indeksAktif ? "true" : undefined}
              onClick={() => keFoto(i)}
            >
              <img src={src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
