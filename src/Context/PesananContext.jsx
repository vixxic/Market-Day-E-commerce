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
  ubahStatusPesanan as ubahStatusPesananLokal,
  parseDaftarPesananSnapshot,
  subscribePesanan,
} from "@/lib/pesanan";
import {
  getDaftarPesananSnapshot,
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
  const item = (pesanan.items ?? pesanan.item ?? []).flatMap((produk) => {
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
    idPesanan: pesanan.id_pesanan ?? pesanan.idPesanan ?? pesanan.id,
    kodeKlaim: pesanan.kode_klaim ?? pesanan.kodeKlaim,
    item,
    nomorPemesan: pesanan.nomor_pemesan ?? pesanan.nomorPemesan,
    namaPenerima: pesanan.nama_penerima ?? pesanan.namaPenerima,
    createdAt: pesanan.created_at ?? pesanan.createdAt,
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
    jumlah: item.jumlah,
    varian: {
      rasa: item.jenis ?? null,
      ukuran: item.ukuran ?? null,
    },
  }));

  return {
    id_toko: idToko,
    nama_penerima: namaPenerima,
    nomor_pemesan: nomorPemesan,
    items: itemPesanan,
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
              if (!pesanan.kodeKlaim) return;
              const statusServer = await ambilStatusPesananApi(
                pesanan.idPesanan,
                pesanan.kodeKlaim,
              );
              if (
                aktif &&
                statusServer.status === "diproses" &&
                String(statusServer.idPesanan) === String(pesanan.idPesanan)
              ) {
                ubahStatusPesananLokal(pesanan.idPesanan, "diproses");
              }
            } catch (galat) {
              if (aktif && galat.status !== 404) {
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
    try {
      const dataApi = susunDataPesanan(data, namaPenerima, nomorPemesan);
      const tersimpanDiServer = await kirimPesanan(dataApi);
      const pesananServer = normalisasiPesananApi(tersimpanDiServer);

      const dataLokal = {
        ...data,
        idCheckout: tersimpanDiServer.id_checkout ?? data.idCheckout,
        idPesanan: pesananServer.idPesanan,
        kodeKlaim: pesananServer.kodeKlaim,
        total: tersimpanDiServer.total ?? data.total,
        namaPenerima,
        nomorPemesan,
        status: "menunggu_otp",
        createdAt: pesananServer.createdAt,
      };

      simpanPemesanan(dataLokal);
      const pesanan = simpanPesananLokal(dataLokal);

      if (String(idTokoAktif) === String(dataApi.id_toko)) {
        setPesananToko((daftar) => [pesananServer, ...daftar]);
      }
      setErrorOperasi(null);
      return pesanan;
    } catch (galat) {
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
