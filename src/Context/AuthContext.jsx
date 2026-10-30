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
import { ambilJsonAman, galatRamah } from "@/lib/galatRamah";

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
      ambilJsonAman("/api/toko/session", {
        signal: pengendali.signal,
      }).catch((galat) => {
        if (galat?.status === 401) return { toko: null };
        throw galat;
      }),
    ])
      .then(([daftar, dataSesi]) => {
        setDaftarToko(daftar.filter((item) => item.aktif !== false));
        setToko(dataSesi?.toko ?? null);
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
    const data = await ambilJsonAman("/api/toko/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namaToko, password }),
    });

    if (!data?.toko) throw galatRamah();

    setToko(data.toko);
    return data.toko;
  }, []);

  const keluar = useCallback(async () => {
    await ambilJsonAman("/api/toko/logout", { method: "POST" });
    setToko(null);
  }, []);

  const daftar = useCallback(async (namaToko, password, whatsappNumber) => {
    const data = await ambilJsonAman("/api/toko/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namaToko, password, whatsappNumber }),
    });

    if (!data?.toko) throw galatRamah();

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
