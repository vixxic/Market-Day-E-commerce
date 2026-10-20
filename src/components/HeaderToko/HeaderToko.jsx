"use client";

import "./HeaderToko.css";

/**
 * Header bagian atas halaman.
 *
 * Props:
 * - judul        : teks judul di kiri (default "Market Day")
 * - onCariKlik   : dipanggil saat ikon cari ditekan
 * - onTokoKlik   : dipanggil saat ikon toko ditekan
 */

export default function HeaderToko({
  judul = "Market Day",
  onCariKlik,
  onTokoKlik,
}) {
  return (
    <header className="header-toko">
      <div className="header-toko__isi">
        <h1 className="header-toko__judul">{judul}</h1>

        <div className="header-toko__aksi">
          <button
            type="button"
            className="header-toko__tombol header-toko__tombol--cari"
            aria-label="Cari produk"
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
