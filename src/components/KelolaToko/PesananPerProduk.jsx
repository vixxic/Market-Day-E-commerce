"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import KartuPesananToko from "@/components/KelolaToko/KartuPesananToko";
import {
  gambarProduk,
  normalisasiPesananToko,
  permintaanKelolaToko,
} from "@/lib/kelolaTokoClient";

export default function PesananPerProduk({ id }) {
  const [produk, setProduk] = useState(null);
  const [pesanan, setPesanan] = useState([]);
  const [error, setError] = useState("");
  const [idMemproses, setIdMemproses] = useState(null);

  useEffect(() => {
    let aktif = true;
    Promise.all([
      permintaanKelolaToko("/api/toko/produk"),
      permintaanKelolaToko("/api/toko/pesanan"),
    ])
      .then(([daftarProduk, daftarPesanan]) => {
        if (!aktif) return;
        setProduk(
          daftarProduk.find((item) => String(item.id) === String(id)) ?? null,
        );
        setPesanan(daftarPesanan.map(normalisasiPesananToko));
        setError("");
      })
      .catch((galat) => {
        if (aktif) setError(galat.message);
      });
    return () => {
      aktif = false;
    };
  }, [id]);

  async function muat() {
    const [daftarProduk, daftarPesanan] = await Promise.all([
      permintaanKelolaToko("/api/toko/produk"),
      permintaanKelolaToko("/api/toko/pesanan"),
    ]);
    setProduk(
      daftarProduk.find((item) => String(item.id) === String(id)) ?? null,
    );
    setPesanan(daftarPesanan.map(normalisasiPesananToko));
    setError("");
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
      setError(galat.message);
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
      await muat();
      return true;
    } catch (galat) {
      setError(galat.message);
      return false;
    } finally {
      setIdMemproses(null);
    }
  }

  const pesananProduk = pesanan.flatMap((order) => {
    const itemTampil = (order.item ?? []).filter(
      (item) => String(item.id_produk) === String(id),
    );
    return itemTampil.length ? [{ order, itemTampil }] : [];
  });

  return (
    <KelolaLayout>
      <main>
        <header className="kelola-toko__bar">
          <Link
            className="kelola-toko__bar-kembali"
            href="/kelolatoko"
            aria-label="Kembali ke kelola toko"
          >
            <FiArrowLeft aria-hidden="true" />
          </Link>
          <h1 className="kelola-toko__bar-judul">
            Pesanan produk{produk ? `: ${produk.nama}` : ""}
          </h1>
        </header>
        {error && (
          <p className="kelola-toko__galat" role="alert">
            {error}
          </p>
        )}
        {!produk && !error && <p>Memuat produk...</p>}
        {produk && pesananProduk.length === 0 && (
          <p className="kelola-toko__kosong">
            Belum ada pesanan untuk produk ini.
          </p>
        )}
        <div className="kelola-toko__order-list">
          {pesananProduk.map(({ order, itemTampil }) => (
            <KartuPesananToko
              key={order.id}
              pesanan={order}
              itemTampil={itemTampil}
              gambarFallback={gambarProduk(produk)}
              onTerima={
                order.status === "menunggu_konfirmasi"
                  ? terimaPesanan
                  : undefined
              }
              onSelesaikan={
                order.status === "diproses" ? selesaikanPesanan : undefined
              }
              sedangMenerima={String(idMemproses) === String(order.id)}
            />
          ))}
        </div>
      </main>
    </KelolaLayout>
  );
}
