"use client";

import "./AnalitikToko.css";
import {
  FiEye,
  FiPackage,
  FiShoppingBag,
  FiTrendingUp,
} from "react-icons/fi";
import { formatHarga } from "@/lib/formatHarga";

function labelHari(tanggal) {
  const waktu = new Date(`${tanggal}T00:00:00Z`);
  return waktu.toLocaleDateString("id-ID", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function labelTanggal(tanggal) {
  const waktu = new Date(`${tanggal}T00:00:00Z`);
  return waktu.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function angka(nilai) {
  return new Intl.NumberFormat("id-ID").format(Number(nilai) || 0);
}

export default function AnalitikToko({ data, loading, error }) {
  if (loading) {
    return (
      <section className="analitik-toko">
        <p className="analitik-toko__status">Memuat analitik toko...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="analitik-toko">
        <p className="analitik-toko__status analitik-toko__status--galat">
          Analitik gagal dimuat: {error}
        </p>
      </section>
    );
  }

  if (!data) return null;

  const ringkasan = data.ringkasan ?? {};
  const grafik = Array.isArray(data.grafik) ? data.grafik : [];
  const maksPendapatan = Math.max(
    ...grafik.map((hari) => Number(hari.pendapatan) || 0),
    1,
  );
  const produkTeratas = data.produkTeratas ?? [];
  const palingDilihat = data.palingDilihat ?? [];

  return (
    <section className="analitik-toko" aria-labelledby="judul-analitik-toko">
      <div className="analitik-toko__heading">
        <div>
          <p className="analitik-toko__eyebrow">Analitik</p>
          <h2 id="judul-analitik-toko">Performa toko</h2>
        </div>
        <span className="analitik-toko__periode">30 hari terakhir</span>
      </div>

      <div className="analitik-toko__ringkasan">
        <article className="analitik-toko__kpi">
          <span className="analitik-toko__kpi-ikon">
            <FiTrendingUp aria-hidden="true" />
          </span>
          <span className="analitik-toko__kpi-label">Pendapatan</span>
          <strong>{formatHarga(ringkasan.totalPendapatan)}</strong>
          <small>
            Rata-rata {formatHarga(ringkasan.rataRataPesanan)} / pesanan
          </small>
        </article>

        <article className="analitik-toko__kpi">
          <span className="analitik-toko__kpi-ikon">
            <FiPackage aria-hidden="true" />
          </span>
          <span className="analitik-toko__kpi-label">Pesanan diterima</span>
          <strong>{angka(ringkasan.pesananDiterima)}</strong>
          <small>{angka(ringkasan.menungguKonfirmasi)} menunggu konfirmasi</small>
        </article>

        <article className="analitik-toko__kpi">
          <span className="analitik-toko__kpi-ikon">
            <FiShoppingBag aria-hidden="true" />
          </span>
          <span className="analitik-toko__kpi-label">Produk terjual</span>
          <strong>{angka(ringkasan.produkTerjual)}</strong>
          <small>{angka(ringkasan.pesananSelesai)} pesanan selesai</small>
        </article>

        <article className="analitik-toko__kpi">
          <span className="analitik-toko__kpi-ikon">
            <FiEye aria-hidden="true" />
          </span>
          <span className="analitik-toko__kpi-label">Produk dilihat</span>
          <strong>{angka(ringkasan.totalDilihat)}</strong>
          <small>{(Number(ringkasan.konversi) || 0).toFixed(1)}% konversi</small>
        </article>
      </div>

      {!data.viewsTersedia && (
        <p className="analitik-toko__catatan">
          Statistik kunjungan belum aktif. Jalankan migrasi
          <code> 20261028120000_add_store_profiles_and_analytics.sql </code>
          untuk mencatat jumlah produk dilihat.
        </p>
      )}

      <div className="analitik-toko__panel">
        <div className="analitik-toko__panel-heading">
          <div>
            <h3>Pendapatan harian</h3>
            <p>Tujuh hari terakhir</p>
          </div>
          <strong>{formatHarga(ringkasan.totalPendapatan)}</strong>
        </div>

        <div
          className="analitik-toko__grafik"
          role="img"
          aria-label="Grafik pendapatan tujuh hari terakhir"
        >
          {grafik.map((hari) => {
            const nilai = Number(hari.pendapatan) || 0;
            const tinggi = nilai
              ? Math.max(7, (nilai / maksPendapatan) * 100)
              : 3;
            return (
              <div
                className="analitik-toko__kolom"
                key={hari.tanggal}
                title={`${labelTanggal(hari.tanggal)}: ${formatHarga(nilai)}`}
              >
                <div className="analitik-toko__batang-wadah">
                  <span
                    className={
                      "analitik-toko__batang" +
                      (nilai ? "" : " analitik-toko__batang--kosong")
                    }
                    style={{ height: `${tinggi}%` }}
                  />
                </div>
                <span className="analitik-toko__kolom-hari">
                  {labelHari(hari.tanggal)}
                </span>
                <span className="analitik-toko__kolom-tanggal">
                  {labelTanggal(hari.tanggal)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="analitik-toko__daftar-grid">
        <div className="analitik-toko__panel">
          <div className="analitik-toko__panel-heading">
            <div>
              <h3>Produk terlaris</h3>
              <p>Berdasarkan jumlah terjual</p>
            </div>
          </div>

          {produkTeratas.length === 0 ? (
            <p className="analitik-toko__kosong">
              Belum ada produk terjual pada periode ini.
            </p>
          ) : (
            <ol className="analitik-toko__daftar">
              {produkTeratas.map((produk, indeks) => (
                <li key={produk.id ?? produk.nama}>
                  <span className="analitik-toko__nomor">{indeks + 1}</span>
                  <span className="analitik-toko__thumb">
                    {produk.gambar ? (
                      <img src={produk.gambar} alt="" loading="lazy" />
                    ) : (
                      <FiShoppingBag aria-hidden="true" />
                    )}
                  </span>
                  <span className="analitik-toko__daftar-teks">
                    <strong>{produk.nama}</strong>
                    <small>
                      {angka(produk.jumlah)} terjual · {angka(produk.dilihat)}{" "}
                      dilihat
                    </small>
                  </span>
                  <span className="analitik-toko__daftar-nilai">
                    {formatHarga(produk.pendapatan)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="analitik-toko__panel">
          <div className="analitik-toko__panel-heading">
            <div>
              <h3>Paling banyak dilihat</h3>
              <p>Minat pembeli pada produkmu</p>
            </div>
          </div>

          {palingDilihat.length === 0 ? (
            <p className="analitik-toko__kosong">
              Belum ada data kunjungan produk.
            </p>
          ) : (
            <ol className="analitik-toko__daftar">
              {palingDilihat.map((produk, indeks) => (
                <li key={produk.id ?? produk.nama}>
                  <span className="analitik-toko__nomor">{indeks + 1}</span>
                  <span className="analitik-toko__thumb">
                    {produk.gambar ? (
                      <img src={produk.gambar} alt="" loading="lazy" />
                    ) : (
                      <FiEye aria-hidden="true" />
                    )}
                  </span>
                  <span className="analitik-toko__daftar-teks">
                    <strong>{produk.nama}</strong>
                    <small>{angka(produk.dilihat)} kali dilihat</small>
                  </span>
                  <span className="analitik-toko__daftar-nilai">
                    <FiEye aria-hidden="true" />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
