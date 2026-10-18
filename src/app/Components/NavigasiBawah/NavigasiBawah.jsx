"use client";

import Link from "next/link";
import "../NavigasiBawah/NavigasiBawah.css";

// context
import { useGlobalContext } from "../../../Context/GlobalContext";

// icons
import { FiHome, FiShoppingCart } from "react-icons/fi";
import { MdStorefront } from "react-icons/md";

const IKON = {
  beranda: <FiHome size={23} />,
  pesanan: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </>
  ),
  keranjang: <FiShoppingCart size={23} />,
  toko: <MdStorefront size={23} />,
};

const MENU_BAWAAN = [
  { id: "beranda", label: "Beranda", href: "/" },
  { id: "pesanan", label: "Pesanan", href: "/pesanan" },
  { id: "keranjang", label: "Keranjang", href: "/keranjang" },
  { id: "toko", label: "Toko", href: "/toko" },
];

export default function NavigasiBawah({
  menu = MENU_BAWAAN,
  halamanAktif = "beranda",
}) {
  const { setPages } = useGlobalContext();

  return (
    <nav className="navigasi-bawah" aria-label="Navigasi utama">
      <ul className="navigasi-bawah__daftar">
        {menu.map((item) => {
          const aktif = item.id === halamanAktif;
          return (
            <li className="navigasi-bawah__butir" key={item.id}>
              <Link
                href={item.href}
                className={
                  "navigasi-bawah__tautan" +
                  (aktif ? " navigasi-bawah__tautan--aktif" : "")
                }
                aria-label={item.label}
                aria-current={aktif ? "page" : undefined}
                onClick={() => setPages(item.id)}
              >
                <svg
                  className="navigasi-bawah__ikon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  {IKON[item.id]}
                </svg>
                <span
                  className="navigasi-bawah__indikator"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
