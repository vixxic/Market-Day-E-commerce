"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ambilKeranjang as bacaKeranjang,
  tambahKeKeranjang as simpanItemKeranjang,
  hapusDariKeranjang as hapusItemKeranjang,
  ubahJumlah as simpanJumlah,
  kosongkanKeranjang as hapusSemua,
  hitungTotal as hitungTotalKeranjang,
  getKeranjangSnapshot,
  subscribeKeranjang,
} from "@/lib/keranjang";
import { getServerStorageSnapshot } from "@/lib/localStorageStore";

const KeranjangContext = createContext(null);

function parseKeranjang(snapshot) {
  if (!snapshot) return [];
  try {
    const data = JSON.parse(snapshot);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Data keranjang di browser tidak valid.", error);
    return [];
  }
}

export function KeranjangProvider({ children }) {
  const snapshot = useSyncExternalStore(
    subscribeKeranjang,
    getKeranjangSnapshot,
    getServerStorageSnapshot,
  );
  const keranjang = useMemo(() => parseKeranjang(snapshot), [snapshot]);
  const siap = snapshot !== null;
  const [error, setError] = useState(null);

  const tambahKeKeranjang = useCallback((items) => {
    try {
      const hasil = simpanItemKeranjang(items);
      setError(null);
      return hasil;
    } catch (galat) {
      setError(galat.message);
      throw galat;
    }
  }, []);

  const hapusDariKeranjang = useCallback((idProduk) => {
    try {
      const hasil = hapusItemKeranjang(idProduk);
      setError(null);
      return hasil;
    } catch (galat) {
      setError(galat.message);
      throw galat;
    }
  }, []);

  const ubahJumlah = useCallback((idProduk, varian, jumlah) => {
    try {
      const hasil = simpanJumlah(idProduk, varian, jumlah);
      setError(null);
      return hasil;
    } catch (galat) {
      setError(galat.message);
      throw galat;
    }
  }, []);

  const kosongkanKeranjang = useCallback(() => {
    try {
      const hasil = hapusSemua();
      setError(null);
      return hasil;
    } catch (galat) {
      setError(galat.message);
      throw galat;
    }
  }, []);
  const ambilKeranjang = useCallback(() => bacaKeranjang(), []);
  const hitungTotal = useCallback(
    () => hitungTotalKeranjang(keranjang),
    [keranjang],
  );

  const value = useMemo(
    () => ({
      keranjang,
      siap,
      error,
      tambahKeKeranjang,
      hapusDariKeranjang,
      ubahJumlah,
      kosongkanKeranjang,
      hitungTotal,
      ambilKeranjang,
    }),
    [
      keranjang,
      siap,
      error,
      tambahKeKeranjang,
      hapusDariKeranjang,
      ubahJumlah,
      kosongkanKeranjang,
      hitungTotal,
      ambilKeranjang,
    ],
  );

  return (
    <KeranjangContext.Provider value={value}>
      {children}
    </KeranjangContext.Provider>
  );
}

export function useKeranjangContext() {
  const context = useContext(KeranjangContext);
  if (!context) {
    throw new Error(
      "useKeranjangContext harus digunakan di dalam KeranjangProvider.",
    );
  }
  return context;
}
