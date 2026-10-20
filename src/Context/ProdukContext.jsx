"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ambilDaftarProduk as requestDaftarProduk,
  ambilProdukById as requestProdukById,
  hapusProduk as requestHapusProduk,
  tambahProduk as requestTambahProduk,
  ubahProduk as requestUbahProduk,
} from "@/lib/api/produkApi";

const ProdukContext = createContext(null);

export function ProdukProvider({ children }) {
  const [daftarProduk, setDaftarProduk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const pengendali = new AbortController();

    requestDaftarProduk({ signal: pengendali.signal })
      .then(setDaftarProduk)
      .catch((galat) => {
        if (galat.name === "AbortError") return;
        console.error(galat);
        setError(galat.message);
      })
      .finally(() => {
        if (!pengendali.signal.aborted) setLoading(false);
      });

    return () => pengendali.abort();
  }, []);

  const ambilProdukById = useCallback(
    async (id, options) => {
      const dariDaftar = daftarProduk.find(
        (produk) => String(produk.id) === String(id),
      );
      if (dariDaftar) return dariDaftar;

      try {
        const produk = await requestProdukById(id, options);
        if (produk) {
          setDaftarProduk((daftar) => {
            const tanpaProdukLama = daftar.filter(
              (item) => String(item.id) !== String(produk.id),
            );
            return [...tanpaProdukLama, produk];
          });
        }
        return produk;
      } catch (galat) {
        if (galat.name !== "AbortError") {
          console.error(galat);
        }
        throw galat;
      }
    },
    [daftarProduk],
  );

  const tambahProduk = useCallback(async (data) => {
    try {
      const produk = await requestTambahProduk(data);
      setDaftarProduk((daftar) => [...daftar, produk]);
      setError(null);
      return produk;
    } catch (galat) {
      setError(galat.message);
      throw galat;
    }
  }, []);

  const ubahProduk = useCallback(async (id, data) => {
    try {
      const produk = await requestUbahProduk(id, data);
      setDaftarProduk((daftar) =>
        daftar.map((item) =>
          String(item.id) === String(id) ? produk : item,
        ),
      );
      setError(null);
      return produk;
    } catch (galat) {
      setError(galat.message);
      throw galat;
    }
  }, []);

  const hapusProduk = useCallback(async (id) => {
    try {
      await requestHapusProduk(id);
      setDaftarProduk((daftar) =>
        daftar.filter((produk) => String(produk.id) !== String(id)),
      );
      setError(null);
    } catch (galat) {
      setError(galat.message);
      throw galat;
    }
  }, []);

  const value = useMemo(
    () => ({
      daftarProduk,
      loading,
      error,
      ambilProdukById,
      tambahProduk,
      ubahProduk,
      hapusProduk,
    }),
    [
      daftarProduk,
      loading,
      error,
      ambilProdukById,
      tambahProduk,
      ubahProduk,
      hapusProduk,
    ],
  );

  return (
    <ProdukContext.Provider value={value}>{children}</ProdukContext.Provider>
  );
}

export function useProdukContext() {
  const context = useContext(ProdukContext);
  if (!context) {
    throw new Error("useProdukContext harus digunakan di dalam ProdukProvider.");
  }
  return context;
}
