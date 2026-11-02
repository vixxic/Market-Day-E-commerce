"use client";

import "./SkeletonBeranda.css";

function Blok({ className, style }) {
  return (
    <span
      className={"skeleton-beranda__blok" + (className ? ` ${className}` : "")}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Kerangka kartu produk. Bentuknya mengikuti KartuProduk supaya grid tidak
 * melompat saat data selesai dimuat.
 */
export function SkeletonKartuProduk() {
  return (
    <article className="skeleton-produk" aria-hidden="true">
      <Blok className="skeleton-produk__gambar" />

      <div className="skeleton-produk__info">
        <div className="skeleton-produk__utama">
          <Blok className="skeleton-produk__nama" />
          <Blok className="skeleton-produk__harga" />
        </div>
        <Blok className="skeleton-produk__aksi" />
        <div className="skeleton-produk__toko">
          <Blok className="skeleton-produk__avatar" />
          <Blok className="skeleton-produk__toko-nama" />
        </div>
      </div>
    </article>
  );
}

/**
 * Grid kerangka produk. Memakai kelas yang sama dengan grid asli sehingga
 * jumlah kolom mengikuti breakpoint Beranda.
 */
export function SkeletonGridProduk({ jumlah = 8 }) {
  return (
    <div className="list-produk-dijual" aria-hidden="true">
      {Array.from({ length: jumlah }, (_, posisi) => (
        <SkeletonKartuProduk key={posisi} />
      ))}
    </div>
  );
}

/**
 * Kerangka kartu toko untuk slider Beranda. Dirender langsung di dalam
 * `.beranda__toko-list` agar perilaku geser dan lebarnya tetap sama.
 */
export function SkeletonKartuToko() {
  return (
    <div className="skeleton-toko" aria-hidden="true">
      <Blok className="skeleton-toko__banner" />

      <div className="skeleton-toko__isi">
        <Blok className="skeleton-toko__avatar" />
        <div className="skeleton-toko__teks">
          <Blok className="skeleton-toko__nama" />
          <Blok className="skeleton-toko__lokasi" />
        </div>
      </div>

      <div className="skeleton-toko__deskripsi">
        <Blok className="skeleton-toko__baris" />
        <Blok className="skeleton-toko__baris" style={{ width: "78%" }} />
      </div>

      <div className="skeleton-toko__kaki">
        <Blok className="skeleton-toko__tautan" />
      </div>
    </div>
  );
}

/** Teks status untuk pembaca layar; kerangkanya sendiri aria-hidden. */
export function StatusMemuat({ children = "Memuat..." }) {
  return (
    <p className="skeleton-beranda__sr" role="status">
      {children}
    </p>
  );
}
