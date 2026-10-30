"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiCalendar, FiClock, FiX } from "react-icons/fi";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import KartuPesananToko from "@/components/KelolaToko/KartuPesananToko";
import {
  SkeletonPesanan,
  SkeletonRingkasanRiwayat,
} from "@/components/KelolaToko/SkeletonPesananToko";
import { ambilPesananToko, pesanGalat } from "@/lib/kelolaTokoClient";
import { formatHarga } from "@/lib/formatHarga";
import { formatBulan, formatTanggal, kunciTanggal } from "@/lib/tanggal";
import "./riwayat.css";

const STATUS_RIWAYAT = ["selesai", "terverifikasi"];

function totalPesanan(pesanan) {
  const total = Number(pesanan.total);
  if (Number.isFinite(total) && total > 0) return total;
  return (pesanan.item ?? []).reduce(
    (jumlah, item) =>
      jumlah + Number(item.subtotal ?? Number(item.harga) * Number(item.jumlah)),
    0,
  );
}

function jumlahProduk(pesanan) {
  return (pesanan.item ?? []).reduce(
    (jumlah, item) => jumlah + Number(item.jumlah || 0),
    0,
  );
}

function waktuPesanan(pesanan) {
  const waktu = Date.parse(pesanan.updated_at ?? pesanan.created_at ?? "");
  return Number.isNaN(waktu) ? 0 : waktu;
}

export default function RiwayatPesananPage() {
  const [pesanan, setPesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bulan, setBulan] = useState("");
  const [tanggal, setTanggal] = useState("");

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

  async function cobaMuatUlang() {
    setLoading(true);
    try {
      setPesanan(await ambilPesananToko());
      setError("");
    } catch (galat) {
      setError(pesanGalat(galat));
    } finally {
      setLoading(false);
    }
  }

  const riwayat = useMemo(
    () =>
      pesanan
        .filter((item) => STATUS_RIWAYAT.includes(item.status))
        .map((item) => ({
          ...item,
          tanggalSelesai: kunciTanggal(item.updated_at ?? item.created_at),
        }))
        .sort((a, b) => waktuPesanan(b) - waktuPesanan(a)),
    [pesanan],
  );

  const daftarBulan = useMemo(() => {
    const kunci = new Set(
      riwayat
        .map((item) => item.tanggalSelesai.slice(0, 7))
        .filter((nilai) => /^\d{4}-\d{2}$/.test(nilai)),
    );
    return [...kunci].sort().reverse();
  }, [riwayat]);

  // Tanggal spesifik menang atas pilihan bulan.
  const tersaring = useMemo(() => {
    if (tanggal) return riwayat.filter((item) => item.tanggalSelesai === tanggal);
    if (bulan) return riwayat.filter((item) => item.tanggalSelesai.startsWith(bulan));
    return riwayat;
  }, [riwayat, bulan, tanggal]);

  const kelompok = useMemo(() => {
    const hasil = [];
    for (const item of tersaring) {
      const terakhir = hasil[hasil.length - 1];
      if (terakhir && terakhir.tanggal === item.tanggalSelesai) {
        terakhir.pesanan.push(item);
      } else {
        hasil.push({ tanggal: item.tanggalSelesai, pesanan: [item] });
      }
    }
    return hasil.map((grup) => ({
      ...grup,
      pendapatan: grup.pesanan.reduce(
        (jumlah, item) => jumlah + totalPesanan(item),
        0,
      ),
    }));
  }, [tersaring]);

  const ringkasan = useMemo(
    () => ({
      jumlah: tersaring.length,
      pendapatan: tersaring.reduce(
        (jumlah, item) => jumlah + totalPesanan(item),
        0,
      ),
      produk: tersaring.reduce(
        (jumlah, item) => jumlah + jumlahProduk(item),
        0,
      ),
    }),
    [tersaring],
  );

  const adaFilter = Boolean(bulan || tanggal);

  function aturTanggal(nilai) {
    setTanggal(nilai);
    if (nilai) setBulan(nilai.slice(0, 7));
  }

  function aturBulan(nilai) {
    setBulan(nilai);
    if (tanggal && nilai && !tanggal.startsWith(nilai)) setTanggal("");
  }

  function resetFilter() {
    setBulan("");
    setTanggal("");
  }

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
          <h1 className="kelola-toko__bar-judul">Riwayat pesanan</h1>
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

        <section className="riwayat__filter" aria-label="Filter riwayat">
          <label className="riwayat__filter-bidang">
            <span>
              <FiCalendar aria-hidden="true" /> Bulan
            </span>
            <select
              value={bulan}
              onChange={(event) => aturBulan(event.target.value)}
            >
              <option value="">Semua bulan</option>
              {daftarBulan.map((kunci) => (
                <option key={kunci} value={kunci}>
                  {formatBulan(kunci)}
                </option>
              ))}
            </select>
          </label>

          <label className="riwayat__filter-bidang">
            <span>
              <FiClock aria-hidden="true" /> Tanggal
            </span>
            <input
              type="date"
              value={tanggal}
              onChange={(event) => aturTanggal(event.target.value)}
            />
          </label>

          {adaFilter && (
            <button
              type="button"
              className="riwayat__reset"
              onClick={resetFilter}
            >
              <FiX aria-hidden="true" /> Reset
            </button>
          )}
        </section>

        {loading && (
          <div aria-hidden="true">
            <SkeletonRingkasanRiwayat />
            <SkeletonPesanan jumlah={2} tombol={false} />
          </div>
        )}

        {!loading && !error && riwayat.length === 0 && (
          <p className="kelola-toko__kosong">
            Belum ada pesanan selesai. Pesanan yang kamu tandai selesai akan
            tersimpan di sini dan tetap dihitung di analitik.
          </p>
        )}

        {!loading && riwayat.length > 0 && (
          <>
            <div className="riwayat__ringkasan" aria-live="polite">
              <span className="riwayat__ringkasan-item">
                <small>Pesanan</small>
                <strong>{ringkasan.jumlah}</strong>
              </span>
              <span className="riwayat__ringkasan-item">
                <small>Pendapatan</small>
                <strong>{formatHarga(ringkasan.pendapatan)}</strong>
              </span>
              <span className="riwayat__ringkasan-item">
                <small>Produk terjual</small>
                <strong>{ringkasan.produk}</strong>
              </span>
            </div>

            {tersaring.length === 0 ? (
              <p className="kelola-toko__kosong">
                Tidak ada pesanan selesai pada {tanggal ? "tanggal" : "bulan"}{" "}
                yang dipilih.
              </p>
            ) : (
              <div className="riwayat__grup">
                {kelompok.map((grup) => (
                  <section key={grup.tanggal} className="riwayat__grup-bagian">
                    <div className="riwayat__grup-heading">
                      <h2>{formatTanggal(grup.tanggal, { denganHari: true })}</h2>
                      <span>
                        {grup.pesanan.length} pesanan ·{" "}
                        {formatHarga(grup.pendapatan)}
                      </span>
                    </div>
                    <div className="kelola-toko__order-list">
                      {grup.pesanan.map((item) => (
                        <KartuPesananToko key={item.id} pesanan={item} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </KelolaLayout>
  );
}
