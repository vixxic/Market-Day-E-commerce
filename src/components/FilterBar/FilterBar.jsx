"use client";

import "./FilterBar.css";

import { useGlobalContext } from "@/Context/GlobalContext";
import { KATEGORI_PRODUK } from "@/lib/kategoriProduk";

/**
 * Deretan tombol filter kategori (pil).
 *
 * Props:
 * - kategori : array teks, contoh ["Semua", "Manis", "Asin"]
 * - aktif    : teks kategori yang sedang dipilih
 * - onPilih  : dipanggil dengan teks kategori saat pil ditekan
 */

export default function FilterBar({ kategori = KATEGORI_PRODUK }) {
  const { filterBeranda, setFilterBeranda } = useGlobalContext();

  return (
    <div
      className="filter-bar"
      role="group"
      aria-label="Filter kategori produk"
    >
      {kategori.map((nama) => {
        const dipilih = nama === filterBeranda;
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
            {nama}
          </button>
        );
      })}
    </div>
  );
}
