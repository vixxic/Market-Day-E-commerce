"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";
import "./Notifikasi.css";

const NotifikasiContext = createContext(null);

const DURASI = { galat: 9000, sukses: 4500, info: 6000 };
const JUDUL = {
  galat: "Terjadi kesalahan",
  sukses: "Berhasil",
  info: "Informasi",
};
const IKON = {
  galat: FiAlertCircle,
  sukses: FiCheckCircle,
  info: FiInfo,
};

export function NotifikasiProvider({ children }) {
  const [daftar, setDaftar] = useState([]);
  const urutan = useRef(0);

  const tutup = useCallback((id) => {
    setDaftar((sebelumnya) => sebelumnya.filter((item) => item.id !== id));
  }, []);

  const tampilkan = useCallback(
    ({ jenis = "info", judul, pesan, durasi }) => {
      urutan.current += 1;
      const id = urutan.current;
      const jenisAman = IKON[jenis] ? jenis : "info";

      setDaftar((sebelumnya) => [
        // Cukup tiga notifikasi sekaligus agar layar tidak tertutup.
        ...sebelumnya.slice(-2),
        {
          id,
          jenis: jenisAman,
          judul: judul ?? JUDUL[jenisAman],
          pesan: String(pesan ?? ""),
        },
      ]);

      const waktu = durasi ?? DURASI[jenisAman] ?? 6000;
      if (waktu > 0) window.setTimeout(() => tutup(id), waktu);

      return id;
    },
    [tutup],
  );

  const value = useMemo(() => {
    const buat = (jenis) => (pesan, opsi = {}) =>
      tampilkan({ ...opsi, jenis, pesan });

    return {
      tampilkan,
      tutup,
      galat: buat("galat"),
      sukses: buat("sukses"),
      info: buat("info"),
    };
  }, [tampilkan, tutup]);

  return (
    <NotifikasiContext.Provider value={value}>
      {children}
      <div className="notifikasi" aria-label="Notifikasi">
        {daftar.map((item) => {
          const Ikon = IKON[item.jenis];
          return (
            <div
              key={item.id}
              className={`notifikasi__item notifikasi__item--${item.jenis}`}
              role={item.jenis === "galat" ? "alert" : "status"}
            >
              <span className="notifikasi__ikon" aria-hidden="true">
                <Ikon />
              </span>
              <div className="notifikasi__teks">
                <strong>{item.judul}</strong>
                <p>{item.pesan}</p>
              </div>
              <button
                type="button"
                className="notifikasi__tutup"
                onClick={() => tutup(item.id)}
                aria-label="Tutup notifikasi"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </NotifikasiContext.Provider>
  );
}

export function useNotifikasi() {
  const konteks = useContext(NotifikasiContext);
  if (!konteks) {
    throw new Error("useNotifikasi harus dipakai di dalam NotifikasiProvider.");
  }
  return konteks;
}
