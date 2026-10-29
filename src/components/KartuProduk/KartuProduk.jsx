"use client";

import "./KartuProduk.css";
import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { formatHarga } from "@/lib/formatHarga";

function inisial(nama) {
  return String(nama ?? "Toko")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join("")
    .toUpperCase();
}

function kategoriPertama(kategori) {
  if (Array.isArray(kategori)) {
    return kategori.find((item) => typeof item === "string" && item.trim());
  }
  if (typeof kategori === "string") {
    return kategori
      .split(",")
      .map((item) => item.trim())
      .find(Boolean);
  }
  return null;
}

/**
 * Props:
 * - nama, harga, gambar, deskripsiGambar, kategori
 * - href     : alamat halaman detail produk
 * - hrefToko : alamat halaman toko (opsional)
 * - namaToko, fotoToko
 */
export default function KartuProduk({
  nama,
  harga,
  gambar,
  namaToko,
  fotoToko,
  kategori,
  deskripsiGambar,
  href,
  hrefToko,
  onTambah,
}) {
  const Tautan = href ? Link : "div";
  const propsTautan = href ? { href } : {};
  const labelKategori = kategoriPertama(kategori);

  return (
    <article className="kartu-produk">
      <Tautan
        {...propsTautan}
        className="kartu-produk__gambar"
        tabIndex={href ? -1 : undefined}
        aria-hidden={href ? "true" : undefined}
      >
        {gambar ? (
          <img
            className="kartu-produk__foto"
            src={gambar}
            alt={deskripsiGambar ?? nama}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="kartu-produk__kosong">Foto belum tersedia</span>
        )}

        {labelKategori && (
          <span className="kartu-produk__kategori">{labelKategori}</span>
        )}
      </Tautan>

      <div className="kartu-produk__info">
        <Tautan {...propsTautan} className="kartu-produk__tautan-utama">
          <h3 className="kartu-produk__nama">{nama}</h3>
          <p className="kartu-produk__harga">{formatHarga(harga)}</p>
        </Tautan>

        {href && (
          <Link
            className="kartu-produk__aksi"
            href={href}
            aria-label={`Lihat ${nama}`}
          >
            <FiArrowUpRight aria-hidden="true" />
          </Link>
        )}

        {namaToko &&
          (hrefToko ? (
            <Link className="kartu-produk__toko" href={hrefToko}>
              <span className="kartu-produk__toko-avatar" aria-hidden="true">
                {fotoToko ? (
                  <img src={fotoToko} alt="" loading="lazy" decoding="async" />
                ) : (
                  inisial(namaToko)
                )}
              </span>
              <span className="kartu-produk__toko-nama">{namaToko}</span>
            </Link>
          ) : (
            <p className="kartu-produk__toko kartu-produk__toko--statis">
              <span className="kartu-produk__toko-avatar" aria-hidden="true">
                {inisial(namaToko)}
              </span>
              <span className="kartu-produk__toko-nama">{namaToko}</span>
            </p>
          ))}
      </div>
    </article>
  );
}
