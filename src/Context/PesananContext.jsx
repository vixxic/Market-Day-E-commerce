"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuthContext } from "@/Context/AuthContext";
import {
  buatPesanan as kirimPesanan,
  ambilStatusPesanan as ambilStatusPesananApi,
} from "@/lib/api/pesananApi";
import {
  buatPesanan as simpanPesananLokal,
  hapusPesanan as hapusPesananLokal,
  ubahStatusPesanan as ubahStatusPesananLokal,
  parseDaftarPesananSnapshot,
  subscribePesanan,
} from "@/lib/pesanan";
import {
  getDaftarPesananSnapshot,
  buatIdCheckout,
  getPemesananSnapshot,
  subscribePemesanan,
  siapkanPemesanan as siapkanPemesananLokal,
  simpanPemesanan,
} from "@/lib/pemesanan";
import { getServerStorageSnapshot } from "@/lib/localStorageStore";

const PesananContext = createContext(null);

function parsePemesanan(snapshot) {
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot);
  } catch (error) {
    console.error("Data pemesanan di browser tidak valid.", error);
    return null;
  }
}

function normalisasiPesananApi(pesanan) {
  const item = (pesanan.item ?? []).flatMap((produk) => {
    const varian = produk.varian ?? {};

    return [
      {
        idProduk: produk.id_produk,
        nama: produk.nama,
        harga: produk.harga,
        jenis: varian.rasa ?? null,
        ukuran: varian.ukuran ?? "",
        jumlah: varian.jumlah ?? produk.jumlah ?? 1,
        gambar: produk.gambar ?? null,
      },
    ];
  });

  return {
    ...pesanan,
    idPesanan: pesanan.idPesanan ?? pesanan.id,
    item,
  };
}

function susunDataPesanan(data, namaPenerima, nomorPemesan) {
  if (!Array.isArray(data.item) || data.item.length === 0) {
    throw new Error("Pesanan tidak berisi produk.");
  }

  const idToko = data.item[0].id_toko;
  if (!idToko) {
    throw new Error(
      "Pesanan belum dapat dikirim karena produk tidak memiliki id_toko.",
    );
  }
  if (data.item.some((item) => String(item.id_toko) !== String(idToko))) {
    throw new Error(
      "Satu pesanan hanya dapat berisi produk dari satu toko.",
    );
  }

  const itemPesanan = data.item.map((item) => ({
    id_produk: item.idProduk,
    nama: item.nama,
    harga: item.harga,
    jumlah: item.jumlah,
    subtotal: item.harga * item.jumlah,
    varian: {
      rasa: item.jenis ?? null,
      ukuran: item.ukuran,
    },
  }));

  const dibuat = new Date().toISOString();

  return {
    idCheckout: buatIdCheckout(),
    idPesanan: data.idPesanan,
    kodeKlaim: data.kodeKlaim,
    id_toko: idToko,
    namaPenerima,
    nomorPemesan,
    total: data.total,
    status: "menunggu_konfirmasi",
    item: itemPesanan,
    createdAt: dibuat,
  };
}

export function PesananProvider({ children }) {
  const { toko } = useAuthContext();
  const idTokoAktif = toko?.id;
  const snapshotLokal = useSyncExternalStore(
    subscribePesanan,
    getDaftarPesananSnapshot,
    getServerStorageSnapshot,
  );
  const snapshotPemesanan = useSyncExternalStore(
    subscribePemesanan,
    getPemesananSnapshot,
    getServerStorageSnapshot,
  );
  const [pesananToko, setPesananToko] = useState([]);
  const [statusPesananToko, setStatusPesananToko] = useState({
    idToko: null,
    error: null,
  });
  const [errorOperasi, setErrorOperasi] = useState(null);

  useEffect(() => {
    if (!idTokoAktif) {
      return undefined;
    }

    const pengendali = new AbortController();

    fetch("/api/toko/pesanan", { signal: pengendali.signal })
      .then(async (respons) => {
        const data = await respons.json();
        if (!respons.ok) {
          throw new Error(data.error ?? "Gagal mengambil daftar pesanan.");
        }
        return data;
      })
      .then((daftar) => {
        setPesananToko(daftar.map(normalisasiPesananApi));
        setStatusPesananToko({
          idToko: String(idTokoAktif),
          error: null,
        });
      })
      .catch((galat) => {
        if (galat.name === "AbortError") return;
        console.error(galat);
        setStatusPesananToko({
          idToko: String(idTokoAktif),
          error: galat.message,
        });
      });

    return () => pengendali.abort();
  }, [idTokoAktif]);

  const daftarLokal = useMemo(
    () => parseDaftarPesananSnapshot(snapshotLokal),
    [snapshotLokal],
  );

  useEffect(() => {
    if (idTokoAktif || daftarLokal.length === 0) return undefined;

    let aktif = true;
    let timer;

    async function sinkronkanStatus() {
      const menunggu = daftarLokal.filter(
        (pesanan) => pesanan.status === "menunggu_konfirmasi",
      );

      if (menunggu.length > 0) {
        await Promise.all(
          menunggu.map(async (pesanan) => {
            try {
              const statusServer = await ambilStatusPesananApi(
                pesanan.idPesanan,
              );
              if (
                aktif &&
                statusServer.status === "diproses" &&
                statusServer.idPesanan === pesanan.idPesanan
              ) {
                ubahStatusPesananLokal(pesanan.idPesanan, "diproses");
              }
            } catch (galat) {
              if (aktif) {
                console.error(
                  `Gagal menyinkronkan status pesanan ${pesanan.idPesanan}.`,
                  galat,
                );
              }
            }
          }),
        );
      }

      if (aktif) timer = window.setTimeout(sinkronkanStatus, 5000);
    }

    sinkronkanStatus();
    return () => {
      aktif = false;
      window.clearTimeout(timer);
    };
  }, [idTokoAktif, daftarLokal]);

  const pesananAktif = useMemo(
    () => parsePemesanan(snapshotPemesanan),
    [snapshotPemesanan],
  );
  const memuatPesananToko =
    Boolean(idTokoAktif) &&
    statusPesananToko.idToko !== String(idTokoAktif);
  const daftarPesanan = useMemo(() => {
    if (!idTokoAktif) return daftarLokal;
    return memuatPesananToko ? [] : pesananToko;
  }, [idTokoAktif, daftarLokal, memuatPesananToko, pesananToko]);
  const error = memuatPesananToko
    ? null
    : statusPesananToko.error ?? errorOperasi;
  const loading =
    snapshotLokal === null ||
    snapshotPemesanan === null ||
    memuatPesananToko;

  const siapkanPemesanan = useCallback((items, options) => {
    try {
      const pemesanan = siapkanPemesananLokal(items, options);
      setErrorOperasi(null);
      return pemesanan;
    } catch (galat) {
      setErrorOperasi(galat.message);
      throw galat;
    }
  }, []);

  const buatPesanan = useCallback(async (data, namaPenerima, nomorPemesan) => {
    let tersimpanDiServer = null;
    let pesanan = null;

    try {
      const dataApi = susunDataPesanan(data, namaPenerima, nomorPemesan);
      const dataLokal = {
        ...data,
        idCheckout: dataApi.idCheckout,
        namaPenerima,
        nomorPemesan,
        status: "menunggu_konfirmasi",
        createdAt: dataApi.createdAt,
      };
      simpanPemesanan(dataLokal);
      pesanan = simpanPesananLokal(dataLokal);
      tersimpanDiServer = await kirimPesanan(dataApi);
      if (String(idTokoAktif) === String(dataApi.id_toko)) {
        setPesananToko((daftar) => [
          normalisasiPesananApi(tersimpanDiServer),
          ...daftar,
        ]);
      }
      setErrorOperasi(null);
      return pesanan;
    } catch (galat) {
      if (pesanan) {
        try {
          hapusPesananLokal(data.idPesanan);
        } catch (galatPembersihan) {
          console.error("Gagal membersihkan pesanan lokal.", galatPembersihan);
        }
      }
      try {
        simpanPemesanan(data);
      } catch (galatPembersihan) {
        console.error("Gagal memulihkan pemesanan lokal.", galatPembersihan);
      }
      setErrorOperasi(galat.message);
      throw galat;
    }
  }, [idTokoAktif]);

  const ambilDaftarPesanan = useCallback(() => daftarPesanan, [daftarPesanan]);
  const ambilPesananById = useCallback(
    (id) =>
      daftarPesanan.find(
        (pesanan) =>
          String(pesanan.idPesanan ?? pesanan.id) === String(id),
      ) ?? null,
    [daftarPesanan],
  );

  const ubahStatusPesanan = useCallback(
    async (id, status) => {
      if (!idTokoAktif) {
        throw new Error("Login toko diperlukan untuk mengubah status pesanan.");
      }

      try {
        const pesananLokal = daftarPesanan.find(
          (item) =>
            String(item.id) === String(id) ||
            String(item.idPesanan) === String(id),
        );
        if (!pesananLokal) {
          throw new Error(`Pesanan "${id}" tidak ditemukan.`);
        }
        if (String(pesananLokal.id_toko) !== String(idTokoAktif)) {
          throw new Error("Toko ini tidak berwenang mengubah pesanan tersebut.");
        }
        const respons = await fetch(
          `/api/toko/pesanan/${encodeURIComponent(pesananLokal.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        const data = await respons.json();
        if (!respons.ok) {
          throw new Error(data.error ?? "Gagal memperbarui status pesanan.");
        }
        const pesanan = data;
        setPesananToko((daftar) =>
          daftar.map((item) =>
            String(item.id) === String(id) ||
            String(item.idPesanan) === String(id)
              ? { ...item, ...pesanan }
              : item,
          ),
        );
        setErrorOperasi(null);
        return pesanan;
      } catch (galat) {
        setErrorOperasi(galat.message);
        throw galat;
      }
    },
    [idTokoAktif, daftarPesanan],
  );

  const verifikasiPesanan = useCallback(
    (id) => ubahStatusPesanan(id, "terverifikasi"),
    [ubahStatusPesanan],
  );

  const value = useMemo(
    () => ({
      daftarPesanan,
      pesananAktif,
      loading,
      error,
      buatPesanan,
      siapkanPemesanan,
      ambilDaftarPesanan,
      ambilPesananById,
      ubahStatusPesanan,
      verifikasiPesanan,
    }),
    [
      daftarPesanan,
      pesananAktif,
      loading,
      error,
      buatPesanan,
      siapkanPemesanan,
      ambilDaftarPesanan,
      ambilPesananById,
      ubahStatusPesanan,
      verifikasiPesanan,
    ],
  );

  return (
    <PesananContext.Provider value={value}>
      {children}
    </PesananContext.Provider>
  );
}

export function usePesananContext() {
  const context = useContext(PesananContext);
  if (!context) {
    throw new Error(
      "usePesananContext harus digunakan di dalam PesananProvider.",
    );
  }
  return context;
}
