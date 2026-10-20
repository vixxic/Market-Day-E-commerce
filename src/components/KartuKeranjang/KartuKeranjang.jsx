"use client";

import "./KartuKeranjang.css";
import { formatHarga } from "@/lib/formatHarga";

/**
 * Satu produk di halaman keranjang.
 *
 * Props:
 * - item     : { idProduk, nama, harga, gambar, varian: [{ jenis, ukuran, jumlah }] }
 * - onHapus       : dipanggil saat ikon tempat sampah ditekan
 * - onUbahJumlah  : dipanggil saat jumlah varian diubah
 * - onPesan       : dipanggil saat tombol Pesan ditekan
 */
export default function KartuKeranjang({
  item,
  onHapus,
  onUbahJumlah,
  onPesan,
}) {
  const totalJumlah = item.varian.reduce((jumlah, v) => jumlah + v.jumlah, 0);
  const totalHarga = item.harga * totalJumlah;

  return (
    <article className="kartu-keranjang">
      <div className="kartu-keranjang__gambar">
        {item.gambar && (
          <img
            className="kartu-keranjang__foto"
            src={item.gambar}
            alt={item.nama}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      <div className="kartu-keranjang__info">
        <div className="kartu-keranjang__atas">
          <h2 className="kartu-keranjang__nama">{item.nama}</h2>

          <button
            type="button"
            className="kartu-keranjang__hapus"
            aria-label={`Hapus ${item.nama} dari keranjang`}
            onClick={onHapus}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7v12.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7" />
            </svg>
          </button>
        </div>

        <p className="kartu-keranjang__jumlah">Jumlah: {totalJumlah}</p>

        <ul className="kartu-keranjang__label-daftar">
          {item.varian.map((v) => (
            <li
              className="kartu-keranjang__varian"
              key={`${v.jenis ?? ""}-${v.ukuran}`}
            >
              <span className="kartu-keranjang__label">
                {[v.jenis, v.ukuran, v.jumlah]
                  .filter((bagian) => bagian !== null && bagian !== undefined)
                  .join(", ")}
              </span>
            </li>
          ))}
        </ul>

        <div className="kartu-keranjang__bawah">
          <p className="kartu-keranjang__harga">{formatHarga(totalHarga)}</p>
          <button
            type="button"
            className="kartu-keranjang__pesan"
            onClick={onPesan}
          >
            Pesan
          </button>
        </div>
      </div>
    </article>
  );
}
