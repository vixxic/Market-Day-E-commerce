"use client";

import "./FilterBar.css";

// context
import { useGlobalContext } from "@/Context/GlobalContext";

const KATEGORI_BAWAAN = [
  "Semua",
  "Manis",
  "Asin",
  "Pedas",
  "Asam",
  "Gurih",
  "Segar",
  "Sehat",
  "Camilan",
  "Makanan Berat",
  "Minuman",
  "Dessert",
  "Kue & Roti",
];

/**
 * Deretan tombol filter kategori (pil).
 *
 * Props:
 * - kategori : array teks, contoh ["Semua", "Manis", "Asin"]
 * - aktif    : teks kategori yang sedang dipilih
 * - onPilih  : dipanggil dengan teks kategori saat pil ditekan
 */

export default function FilterBar({ kategori = KATEGORI_BAWAAN }) {
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
