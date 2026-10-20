"use client";

import "./kelolaToko.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";
import { useAuthContext } from "@/Context/AuthContext";

export default function KelolaLayout({ children }) {
  const { toko, memuatSesi, keluar } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [errorKeluar, setErrorKeluar] = useState("");

  useEffect(() => {
    if (!memuatSesi && !toko) router.replace("/masuktoko");
  }, [memuatSesi, toko, router]);

  async function logout() {
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

  return (
    <div className="kelola-toko">
      <header className="kelola-toko__header">
        <Link className="kelola-toko__brand" href="/kelolatoko">
          {toko.namaToko}
        </Link>
        <button
          type="button"
          className="kelola-toko__keluar"
          onClick={logout}
        >
          Keluar
        </button>
      </header>
      {pathname !== "/kelolatoko" && (
        <Link className="kelola-toko__kembali" href="/kelolatoko">
          ← Kembali ke kelola toko
        </Link>
      )}
      {errorKeluar && (
        <p className="kelola-toko__galat" role="alert">
          {errorKeluar}
        </p>
      )}
      {children}
    </div>
  );
}
