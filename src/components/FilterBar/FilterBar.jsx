"use client";

import "./FilterBar.css";

import { useGlobalContext } from "@/Context/GlobalContext";
import { KATEGORI_PRODUK } from "@/lib/kategoriProduk";

const KATEGORI_FILTER = ["All", ...KATEGORI_PRODUK];

/**
 * Deretan tombol filter kategori (pil).
 *
 * Props:
 * - kategori  : array teks, contoh ["All", "Manis", "Asin"]
 * - hitungan  : objek jumlah produk per kategori, contoh { All: 12, Makanan: 5 }
 */

export default function FilterBar({
  kategori = KATEGORI_FILTER,
  hitungan,
}) {
  const { filterBeranda, setFilterBeranda } = useGlobalContext();

  return (
    <div
      className="filter-bar"
      role="group"
      aria-label="Filter kategori produk"
    >
      {kategori.map((nama) => {
        const dipilih = nama === filterBeranda;
        const jumlah = hitungan?.[nama];
        return (
          <button
            key={nama}
            type="button"
            className={
              "filter-bar__pil" + (dipilih ? " filter-bar__pil--aktif" : "")
            }
            aria-pressed={dipilih}
            onClick={() => setFilterBeranda(nama)}
          >
            <span>{nama}</span>
            {typeof jumlah === "number" && (
              <span className="filter-bar__jumlah" aria-hidden="true">
                {jumlah}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
