"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import KartuPesananToko from "@/components/KelolaToko/KartuPesananToko";
import { SkeletonPesanan } from "@/components/KelolaToko/SkeletonPesananToko";
import {
  ambilPesananToko,
  permintaanKelolaToko,
  pesanGalat,
} from "@/lib/kelolaTokoClient";

export default function PesananTokoPage({ statusHalaman = "permintaan" }) {
  const router = useRouter();
  const [pesanan, setPesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idMemproses, setIdMemproses] = useState(null);

  useEffect(() => {
    let aktif = true;
    ambilPesananToko()
      .then((daftar) => {
        if (!aktif) return;
        setPesanan(daftar);
        setError("");
      })
      .catch((galat) => {
        if (aktif) setError(pesanGalat(galat));
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  async function muatPesanan() {
    setPesanan(await ambilPesananToko());
    setError("");
  }

  async function cobaMuatUlang() {
    setLoading(true);
    try {
      await muatPesanan();
    } catch (galat) {
      setError(pesanGalat(galat));
    } finally {
      setLoading(false);
    }
  }

  async function terimaPesanan(item) {
    await ubahStatusPesanan(item, "diproses");
  }

  async function selesaikanPesanan(item) {
    setIdMemproses(item.id);
    try {
      const diperbarui = await permintaanKelolaToko(
        `/api/toko/pesanan/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "selesai" }),
        },
      );
      setPesanan((daftar) =>
        daftar.map((pesananTersimpan) =>
          String(pesananTersimpan.id) === String(item.id)
            ? {
                ...pesananTersimpan,
                status: "selesai",
                updated_at:
                  diperbarui?.updated_at ?? pesananTersimpan.updated_at,
              }
            : pesananTersimpan,
        ),
      );
      setError("");
      return true;
    } catch (galat) {
      setError(pesanGalat(galat));
      return false;
    } finally {
      setIdMemproses(null);
    }
  }

  async function ubahStatusPesanan(item, status) {
    setIdMemproses(item.id);
    try {
      await permintaanKelolaToko(`/api/toko/pesanan/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await muatPesanan();
      return true;
    } catch (galat) {
      setError(pesanGalat(galat));
      return false;
    } finally {
      setIdMemproses(null);
    }
  }

  const ditampilkan = pesanan.filter((item) =>
    statusHalaman === "permintaan"
      ? item.status === "menunggu_konfirmasi"
      : item.status === "diproses",
  );

  return (
    <KelolaLayout>
      <main>
        <header className="kelola-toko__bar">
          <button
            type="button"
            className="kelola-toko__bar-kembali"
            onClick={() => router.back()}
            aria-label="Kembali"
          >
            <FiArrowLeft aria-hidden="true" />
          </button>
          <h1 className="kelola-toko__bar-judul">
            {statusHalaman === "permintaan"
              ? "Permintaan pesanan"
              : "Pesanan diterima"}
          </h1>
        </header>

        {error && (
          <div className="kelola-toko__galat" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="kelola-toko__galat-ulang"
              onClick={cobaMuatUlang}
              disabled={loading}
            >
              {loading ? "Mencoba..." : "Coba lagi"}
            </button>
          </div>
        )}

        {loading ? (
          <SkeletonPesanan jumlah={3} />
        ) : (
          !error && (
            <>
              {ditampilkan.length === 0 && (
                <p className="kelola-toko__kosong">
                  {statusHalaman === "permintaan"
                    ? "Belum ada permintaan pesanan."
                    : "Belum ada pesanan yang diterima."}
                </p>
              )}
              <div className="kelola-toko__order-list">
                {ditampilkan.map((item) => (
                  <KartuPesananToko
                    key={item.id}
                    pesanan={item}
                    onTerima={
                      statusHalaman === "permintaan"
                        ? terimaPesanan
                        : undefined
                    }
                    onTolak={
                      statusHalaman === "permintaan"
                        ? (itemPesanan) =>
                            ubahStatusPesanan(itemPesanan, "ditolak")
                        : undefined
                    }
                    onBatalkan={
                      statusHalaman === "diterima" &&
                      item.status === "diproses"
                        ? (itemPesanan) =>
                            ubahStatusPesanan(itemPesanan, "dibatalkan")
                        : undefined
                    }
                    onSelesaikan={
                      statusHalaman === "diterima" &&
                      item.status === "diproses"
                        ? selesaikanPesanan
                        : undefined
                    }
                    sedangMenerima={String(idMemproses) === String(item.id)}
                  />
                ))}
              </div>
            </>
          )
        )}

        {statusHalaman === "diterima" && (
          <p className="kelola-toko__tautan-riwayat">
            <Link href="/kelolatoko/riwayat">
              Lihat riwayat pesanan selesai
            </Link>
          </p>
        )}
      </main>
    </KelolaLayout>
  );
}
