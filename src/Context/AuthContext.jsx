"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ambilDaftarToko } from "@/lib/api/tokoApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [daftarToko, setDaftarToko] = useState([]);
  const [memuatToko, setMemuatToko] = useState(true);
  const [errorToko, setErrorToko] = useState(null);
  const [toko, setToko] = useState(null);
  const [memuatSesi, setMemuatSesi] = useState(true);

  useEffect(() => {
    const pengendali = new AbortController();

    Promise.all([
      ambilDaftarToko({ signal: pengendali.signal }),
      fetch("/api/toko/session", { signal: pengendali.signal }),
    ])
      .then(async ([daftar, responsSesi]) => {
        setDaftarToko(daftar.filter((item) => item.aktif !== false));
        if (responsSesi.ok) {
          const dataSesi = await responsSesi.json();
          setToko(dataSesi.toko ?? null);
        }
      })
      .catch((galat) => {
        if (galat.name === "AbortError") return;
        console.error(galat);
        setErrorToko(galat.message);
      })
      .finally(() => {
        if (!pengendali.signal.aborted) {
          setMemuatToko(false);
          setMemuatSesi(false);
        }
      });

    return () => pengendali.abort();
  }, []);

  const masuk = useCallback(async (namaToko, password) => {
    const respons = await fetch("/api/toko/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namaToko, password }),
    });
    const data = await respons.json();
    if (!respons.ok) {
      throw new Error(data.error ?? "Gagal masuk ke toko.");
    }
    setToko(data.toko);
    return data.toko;
  }, []);

  const keluar = useCallback(async () => {
    const respons = await fetch("/api/toko/logout", { method: "POST" });
    if (!respons.ok) throw new Error("Gagal keluar dari toko.");
    setToko(null);
  }, []);

  const daftar = useCallback(async (namaToko, password) => {
    const respons = await fetch("/api/toko/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namaToko, password }),
    });
    const data = await respons.json();
    if (!respons.ok) {
      throw new Error(data.error ?? "Gagal mendaftarkan toko.");
    }
    setToko(data.toko);
    return data.toko;
  }, []);

  const value = useMemo(
    () => ({
      toko,
      sudahLogin: Boolean(toko),
      daftarToko,
      memuatToko,
      memuatSesi,
      errorToko,
      masuk,
      keluar,
      daftar,
    }),
    [
      toko,
      daftarToko,
      memuatToko,
      memuatSesi,
      errorToko,
      masuk,
      keluar,
      daftar,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext harus digunakan di dalam AuthProvider.");
  }
  return context;
}
