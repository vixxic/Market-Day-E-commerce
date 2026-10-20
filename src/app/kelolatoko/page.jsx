"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import { permintaanKelolaToko, gambarProduk } from "@/lib/kelolaTokoClient";
import { formatHarga } from "@/lib/formatHarga";

export default function KelolaProdukPage() {
  const [produk, setProduk] = useState([]);
  const [pesanan, setPesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let aktif = true;
    Promise.all([
      permintaanKelolaToko("/api/toko/produk"),
      permintaanKelolaToko("/api/toko/pesanan"),
    ])
      .then(([daftarProduk, daftarPesanan]) => {
        if (!aktif) return;
        setProduk(daftarProduk);
        setPesanan(daftarPesanan);
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

  const menunggu = pesanan.filter(
    (item) => item.status === "menunggu_konfirmasi",
  ).length;
  const diterima = pesanan.filter((item) =>
    ["diproses", "selesai", "terverifikasi"].includes(item.status),
  ).length;

  return (
    <KelolaLayout>
      <main>
        <h1 className="kelola-toko__judul">Kelola toko dan produkmu di sini</h1>

        {error && <p className="kelola-toko__galat" role="alert">{error}</p>}

        <div className="kelola-toko__statistik">
          <Link
            className="kelola-toko__stat"
            href="/kelolatoko/pesanan-diterima"
          >
            <strong>{diterima}</strong>
            Pesanan diterima
          </Link>
          <Link
            className="kelola-toko__stat"
            href="/kelolatoko/pesanan"
          >
            <strong>{menunggu}</strong>
            Permintaan pesanan
          </Link>
        </div>

        <section>
          <div className="kelola-toko__produk-heading">
            <h2 className="kelola-toko__tag">Produkmu</h2>
            {loading && <span>Memuat...</span>}
          </div>

          {!loading && !error && produk.length === 0 && (
            <p className="kelola-toko__kosong">
              Belum ada produk. Tekan tombol + untuk menambahkan produk.
            </p>
          )}

          <div className="kelola-toko__produk-list">
            {produk.map((item) => {
              const jumlahPesanan = pesanan.reduce(
                (jumlah, order) =>
                  jumlah +
                  (order.item ?? [])
                    .filter(
                      (baris) => String(baris.id_produk) === String(item.id),
                    )
                    .reduce((total, baris) => total + Number(baris.jumlah || 0), 0),
                0,
              );

              return (
                <article className="kelola-toko__produk" key={item.id}>
                  <Link href={`/kelolatoko/produk/${item.id}`}>
                    <img
                      className="kelola-toko__foto"
                      src={gambarProduk(item)}
                      alt={item.nama}
                    />
                  </Link>
                  <div>
                    <h3 className="kelola-toko__produk-nama">{item.nama}</h3>
                    <p className="kelola-toko__harga">
                      {formatHarga(item.harga)}
                    </p>
                    <Link
                      className="kelola-toko__tombol kelola-toko__produk-aksi"
                      href={`/kelolatoko/produk/${item.id}`}
                    >
                      Lihat pesanan
                    </Link>
                  </div>
                  <span className="kelola-toko__jumlah">{jumlahPesanan}</span>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <Link
        href="/kelolatoko/produk/tambah"
        className="kelola-toko__tambah"
        aria-label="Tambah produk baru"
      >
        +
      </Link>
    </KelolaLayout>
  );
}
