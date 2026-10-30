"use client";

import "./kelolaToko.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";
import { useAuthContext } from "@/Context/AuthContext";
import { MdLogout } from "react-icons/md";
import { FiUser } from "react-icons/fi";

export default function KelolaLayout({
  children,
  tanpaHeader = false,
  lebarPenuh = false,
}) {
  const { toko, memuatSesi, keluar } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [errorKeluar, setErrorKeluar] = useState("");

  useEffect(() => {
    if (!memuatSesi && !toko) router.replace("/masuktoko");
  }, [memuatSesi, toko, router]);

  async function logout() {
    setErrorKeluar("");
    try {
      await keluar();
      router.replace("/masuktoko");
    } catch (error) {
      setErrorKeluar(error.message);
    }
  }

  if (memuatSesi || !toko) {
    return <main className="kelola-toko__memuat">Memeriksa sesi toko...</main>;
  }

  const tampilkanHeader =
    !tanpaHeader &&
    (pathname === "/kelolatoko" || pathname === "/masuktoko");

  return (
    <div
      className={
        "kelola-toko" + (lebarPenuh ? " kelola-toko--lebar" : "")
      }
    >
      {tampilkanHeader && (
        <>
          <header className="kelola-toko__header">
            <Link className="kelola-toko__brand" href="/kelolatoko">
              {toko.namaToko}
            </Link>
            <div className="kelola-toko__header-aksi">
              {pathname === "/kelolatoko" && (
                <Link
                  className="kelola-toko__keluar"
                  href="/kelolatoko/profil"
                  aria-label="Atur profil toko"
                >
                  <FiUser size={21} />
                </Link>
              )}
              <button
                type="button"
                className="kelola-toko__keluar"
                onClick={logout}
                aria-label="Keluar dari toko"
              >
                <MdLogout size={23} />
              </button>
            </div>
          </header>
          {errorKeluar && (
            <p className="kelola-toko__galat" role="alert">
              {errorKeluar}
            </p>
          )}
        </>
      )}
      {children}
    </div>
  );
}
