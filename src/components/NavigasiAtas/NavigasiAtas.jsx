"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdStorefront } from "react-icons/md";
import { FiSearch, FiShoppingCart } from "react-icons/fi";
import { useKeranjangContext } from "@/Context/KeranjangContext";
import { useGlobalContext } from "@/Context/GlobalContext";
import "../HeaderToko/HeaderToko.css";
import "./NavigasiAtas.css";

export default function NavigasiAtas() {
  const router = useRouter();
  const { keranjang } = useKeranjangContext();
  const { kueriBeranda, setKueriBeranda } = useGlobalContext();

  const jumlahKeranjang = keranjang.reduce(
    (total, item) =>
      total +
      (item.varian ?? []).reduce(
        (jumlah, varian) => jumlah + (Number(varian.jumlah) || 0),
        0,
      ),
    0,
  );

  return (
    <header className="header-toko header-toko--desktop">
      <div className="header-toko__pita" aria-hidden="true" />
      <div className="header-toko__isi">
        <Link className="header-toko__merek" href="/" aria-label="Market Day">
          <span className="header-toko__merek-teks">
            <span className="header-toko__baris-judul">
              <span className="header-toko__judul">Market Day</span>
            </span>
            <span className="header-toko__subjudul">
              Sekolah Tri Ratna Jakarta
            </span>
          </span>
        </Link>

        <form
          className="header-toko__cari"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            router.push("/");
          }}
        >
          <input
            type="search"
            value={kueriBeranda}
            onChange={(event) => setKueriBeranda(event.target.value)}
            placeholder="Cari menu jajanan, minuman, atau nama toko siswa"
            aria-label="Cari produk atau nama toko"
          />
          <button className="header-toko__cari-kirim" type="submit">
            <FiSearch size={16} />
          </button>
        </form>

        <nav className="header-toko__menu" aria-label="Navigasi utama">
          <Link className="header-toko__menu-tautan" href="/">
            Katalog Produk
          </Link>
          <Link className="header-toko__menu-tautan" href="/pesanan">
            Pesananmu
          </Link>
        </nav>

        <Link className="header-toko__keranjang" href="/keranjang">
          <FiShoppingCart aria-hidden="true" />
          <span>Keranjang</span>
          <span
            className="header-toko__keranjang-jumlah"
            aria-label={`${jumlahKeranjang} item`}
          >
            {jumlahKeranjang}
          </span>
        </Link>

        <Link href="/masuktoko">
          <span className="header-toko__logo" aria-hidden="true">
            <MdStorefront />
          </span>
        </Link>
      </div>
    </header>
  );
}
