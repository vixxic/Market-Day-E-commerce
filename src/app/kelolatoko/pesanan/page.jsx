"use client";

import { useEffect, useState } from "react";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import KartuPesananToko from "@/components/KelolaToko/KartuPesananToko";
import { permintaanKelolaToko } from "@/lib/kelolaTokoClient";

export default function PesananTokoPage({ statusHalaman = "permintaan" }) {
  const [pesanan, setPesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idMemproses, setIdMemproses] = useState(null);

  useEffect(() => {
    let aktif = true;
    permintaanKelolaToko("/api/toko/pesanan")
      .then((daftar) => {
        if (!aktif) return;
        setPesanan(daftar);
        setError("");
      })
      .catch((galat) => {
        if (aktif) setError(galat.message);
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  async function muatPesanan() {
    const daftar = await permintaanKelolaToko("/api/toko/pesanan");
    setPesanan(daftar);
    setError("");
  }

  async function terimaPesanan(item) {
    setIdMemproses(item.id);
    try {
      await permintaanKelolaToko(`/api/toko/pesanan/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "diproses" }),
      });
      await muatPesanan();
    } catch (galat) {
      setError(galat.message);
    } finally {
      setIdMemproses(null);
    }
  }

  const ditampilkan = pesanan.filter((item) =>
    statusHalaman === "permintaan"
      ? item.status === "menunggu_konfirmasi"
      : ["diproses", "selesai", "terverifikasi"].includes(item.status),
  );

  return (
    <KelolaLayout>
      <main>
        <h1 className="kelola-toko__judul">
          {statusHalaman === "permintaan" ? "Permintaan pesanan" : "Pesanan diterima"}
        </h1>
        {error && <p className="kelola-toko__galat" role="alert">{error}</p>}
        {loading && <p>Memuat pesanan...</p>}
        {!loading && !error && ditampilkan.length === 0 && (
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
                statusHalaman === "permintaan" ? terimaPesanan : undefined
              }
              sedangMenerima={String(idMemproses) === String(item.id)}
            />
          ))}
        </div>
      </main>
    </KelolaLayout>
  );
}
