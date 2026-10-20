"use client";

import "./KartuProduk.css";
import Link from "next/link";
import { formatHarga } from "@/lib/formatHarga";

/**
 * Props:
 * - nama, harga, gambar, deskripsiGambar
 * - href     : alamat halaman detail, contoh "/produk/3".
 *              Gambar dan teks (nama + harga) menjadi tautan ke alamat ini.
 * - onTambah : dipanggil saat tombol + ditekan
 */
export default function KartuProduk({
  nama,
  harga,
  gambar,
  namaToko,
  deskripsiGambar,
  href,
  onTambah,
}) {
  // Tanpa href, bagian ini tampil biasa (tidak bisa ditekan)
  const Tautan = href ? Link : "div";
  const propsTautan = href ? { href } : {};

  return (
    <article className="kartu-produk">
      {/* Tautan gambar disembunyikan dari pembaca layar & tab
          karena tautan teks di bawahnya sudah menuju tujuan yang sama */}
      <Tautan
        {...propsTautan}
        className="kartu-produk__gambar"
        tabIndex={href ? -1 : undefined}
        aria-hidden={href ? "true" : undefined}
      >
        {gambar && (
          <img
            className="kartu-produk__foto"
            src={gambar}
            alt={deskripsiGambar ?? nama}
            loading="lazy"
            decoding="async"
          />
        )}
      </Tautan>

      <div className="kartu-produk__info">
        <Tautan {...propsTautan} className="kartu-produk__teks">
          <h3 className="kartu-produk__nama">{nama}</h3>
          <p className="kartu-produk__harga">{formatHarga(harga)}</p>
          {namaToko && (
            <p className="kartu-produk__toko">{namaToko}</p>
          )}
        </Tautan>
      </div>
    </article>
  );
}
