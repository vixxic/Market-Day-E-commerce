"use client";

import "./KartuKeranjang.css";
import { formatHarga } from "@/lib/formatHarga";
import { hargaBaris, totalBaris } from "@/lib/keranjang";
import { adaPromo, labelPromo } from "@/lib/promoProduk";

/**
 * Satu produk di halaman keranjang.
 *
 * Props:
 * - item     : { idProduk, nama, harga, gambar, promo, varian: [{ jenis, ukuran, jumlah }] }
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
  const rincian = item.varian.map((v) => totalBaris(item, v));
  const totalHarga = rincian.reduce((total, r) => total + r.subtotal, 0);
  const totalHemat = rincian.reduce((total, r) => total + r.diskon, 0);
  const labelPromoItem = adaPromo(item.promo) ? labelPromo(item.promo) : "";

  const shownImage = Array.isArray(item.gambar)
    ? item.gambar[0] ?? ""
    : typeof item.gambar === "string"
    ? item.gambar
    : "";

  return (
    <article className="kartu-keranjang">
      <div className="kartu-keranjang__gambar">
        {shownImage && (
          <img
            className="kartu-keranjang__foto"
            src={shownImage}
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

        {labelPromoItem && (
          <p className="kartu-keranjang__promo">{labelPromoItem}</p>
        )}

        <ul className="kartu-keranjang__label-daftar">
          {item.varian.map((v, i) => (
            <li
              className="kartu-keranjang__varian"
              key={`${v.jenis ?? ""}-${v.ukuran}`}
            >
              <span className="kartu-keranjang__label">
                {[v.jenis, v.ukuran, v.jumlah]
                  .filter((bagian) => bagian !== null && bagian !== undefined)
                  .join(", ")}{" "}
                <small className="kartu-keranjang__harga-varian">
                  {formatHarga(hargaBaris(item, v))}
                </small>
              </span>
              {rincian[i].diskon > 0 && (
                <span className="kartu-keranjang__hemat">
                  Hemat {formatHarga(rincian[i].diskon)}
                  {rincian[i].gratis > 0
                    ? ` · ${rincian[i].gratis} gratis`
                    : ""}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="kartu-keranjang__bawah">
          <p className="kartu-keranjang__harga">
            {formatHarga(totalHarga)}
            {totalHemat > 0 && (
              <small className="kartu-keranjang__harga-hemat">
                Hemat {formatHarga(totalHemat)}
              </small>
            )}
          </p>
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
