"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import NavigasiBawah from "@/components/NavigasiBawah/NavigasiBawah";
import {
  permintaanKelolaToko,
  gambarProduk,
  normalisasiPesananToko,
} from "@/lib/kelolaTokoClient";
import { formatHarga } from "@/lib/formatHarga";
import PopupKonfirmasi from "@/components/PopupKonfirmasi/PopupKonfirmasi";

export default function DashboardToko() {
  const [produk, setProduk] = useState([]);
  const [pesanan, setPesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hapusId, setHapusId] = useState(null);
  const [sedangHapus, setSedangHapus] = useState(false);

  useEffect(() => {
    let aktif = true;
    let sedangMemuat = false;

    async function muatData(tampilkanLoading = false) {
      if (sedangMemuat) return;
      sedangMemuat = true;
      if (tampilkanLoading) setLoading(true);

      try {
        const [daftarProduk, daftarPesanan] = await Promise.all([
          permintaanKelolaToko("/api/toko/produk"),
          permintaanKelolaToko("/api/toko/pesanan"),
        ]);
        if (!aktif) return;
        setProduk(daftarProduk);
        setPesanan(daftarPesanan.map(normalisasiPesananToko));
        setError("");
      } catch (galat) {
        if (aktif) setError(galat.message);
      } finally {
        sedangMemuat = false;
        if (aktif && tampilkanLoading) setLoading(false);
      }
    }

    muatData(true);
    const interval = window.setInterval(() => muatData(), 10000);

    return () => {
      aktif = false;
      window.clearInterval(interval);
    };
  }, []);

  async function konfirmasiHapus() {
    if (!hapusId) return;
    setSedangHapus(true);
    try {
      await permintaanKelolaToko(`/api/toko/produk/${hapusId}`, {
        method: "DELETE",
      });
      setProduk((prev) => prev.filter((p) => p.id !== hapusId));
    } catch (galat) {
      alert("Gagal menghapus produk: " + galat.message);
    } finally {
      setSedangHapus(false);
      setHapusId(null);
    }
  }

  const menunggu = pesanan.filter(
    (item) => item.status === "menunggu_konfirmasi",
  ).length;
  const diterima = pesanan.filter((item) =>
    ["diproses", "selesai", "terverifikasi"].includes(item.status),
  ).length;

  return (
    <KelolaLayout>
      <main className="kelola-produk">
        <h1 className="kelola-toko__judul">Kelola toko dan produkmu di sini</h1>

        {error && (
          <p className="kelola-toko__galat" role="alert">
            {error}
          </p>
        )}

        <div className="kelola-toko__statistik">
          <Link
            className="kelola-toko__stat"
            href="/kelolatoko/pesanan-diterima"
          >
            <div className="toko-stat-enter">
              <strong>{diterima}</strong>
              <span>
                <FaRegArrowAltCircleRight size={19} />
              </span>
            </div>
            <span>Pesanan diterima</span>
          </Link>
          <Link className="kelola-toko__stat" href="/kelolatoko/pesanan">
            <div className="toko-stat-enter">
              <strong>{menunggu}</strong>
              <span>
                <FaRegArrowAltCircleRight size={19} />
              </span>
            </div>
            <span>Permintaan pesanan</span>
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
                    .reduce(
                      (total, baris) => total + Number(baris.jumlah || 0),
                      0,
                    ),
                0,
              );

              return (
                <article className="kelola-toko__produk" key={item.id}>
                  <Link
                    className="kelola-toko__foto-link"
                    href={`/kelolatoko/produk/${item.id}`}
                  >
                    <img
                      className="kelola-toko__foto"
                      src={gambarProduk(item)}
                      alt={item.nama}
                    />
                  </Link>

                  <div className="kelola-toko__produk-info">
                    <h3 className="kelola-toko__produk-nama">{item.nama}</h3>
                    <p className="kelola-toko__harga">
                      {formatHarga(item.harga)}
                    </p>
                    <div className="kelola-toko__aksi-grup" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                      <Link
                        className="kelola-toko__tombol kelola-toko__produk-aksi"
                        href={`/kelolatoko/produk/${item.id}`}
                      >
                        Lihat pesanan
                      </Link>
                      <Link
                        className="kelola-toko__tombol kelola-toko__produk-edit"
                        href={`/kelolatoko/produk/edit/${item.id}`}
                      >
                        <FiEdit size={16} />
                      </Link>
                      <button
                        className="kelola-toko__tombol kelola-toko__produk-hapus"
                        onClick={() => setHapusId(item.id)}
                        type="button"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
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
        <FiPlus aria-hidden="true" strokeWidth={1.6} />
      </Link>
      <NavigasiBawah halamanAktif="masuktoko" />
      
      <PopupKonfirmasi
        buka={hapusId !== null}
        judul="Hapus Produk?"
        pesan="Produk akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        teksKonfirmasi="Ya, hapus"
        teksBatal="Batal"
        memproses={sedangHapus}
        onKonfirmasi={konfirmasiHapus}
        onBatal={() => setHapusId(null)}
      />
    </KelolaLayout>
  );
}
