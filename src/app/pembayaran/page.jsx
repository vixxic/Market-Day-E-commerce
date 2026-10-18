"use client";

import "./pembayaran.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// utils
import { formatHarga } from "../formatHarga";
import { ambilPembayaran, tandaiMenungguVerifikasi } from "@/app/pembayaran";
import { hapusDariKeranjang } from "../keranjang";

// TODO: ganti dengan nomor WhatsApp penjual / admin
const NOMOR_WA_LINK = "6281234567890"; // format internasional, tanpa + dan spasi
const NOMOR_WA_TAMPIL = "+62 812-3456-7890";

const UKURAN_BUKTI_MAKS_MB = 5;

export default function Pembayaran() {
  const router = useRouter();

  const [siap, setSiap] = useState(false); // false sampai localStorage terbaca
  const [pembayaran, setPembayaran] = useState(null);

  const [bukti, setBukti] = useState(null);
  const [urlPratinjau, setUrlPratinjau] = useState(null);
  const [namaPenerima, setNamaPenerima] = useState("");
  const [galat, setGalat] = useState({});
  const [qrisGagal, setQrisGagal] = useState(false);

  const judulSelesaiRef = useRef(null);

  useEffect(() => {
    setPembayaran(ambilPembayaran());
    setSiap(true);
  }, []);

  // Pratinjau foto bukti pembayaran
  useEffect(() => {
    if (!bukti) {
      setUrlPratinjau(null);
      return;
    }
    const url = URL.createObjectURL(bukti);
    setUrlPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [bukti]);

  const menungguVerifikasi = pembayaran?.status === "menunggu_verifikasi";

  // Setelah transaksi selesai: ke atas halaman & fokus ke judul agar terbaca pembaca layar
  useEffect(() => {
    if (!menungguVerifikasi) return;
    window.scrollTo(0, 0);
    judulSelesaiRef.current?.focus();
  }, [menungguVerifikasi]);

  function kembali() {
    if (menungguVerifikasi) router.push("/");
    else if (window.history.length > 1) router.back();
    else router.push("/keranjang");
  }

  function pilihBukti(e) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    if (!berkas.type.startsWith("image/")) {
      setGalat((g) => ({ ...g, bukti: "Berkas harus berupa gambar." }));
      return;
    }
    if (berkas.size > UKURAN_BUKTI_MAKS_MB * 1024 * 1024) {
      setGalat((g) => ({
        ...g,
        bukti: `Ukuran gambar maksimal ${UKURAN_BUKTI_MAKS_MB} MB.`,
      }));
      return;
    }

    setBukti(berkas);
    setGalat((g) => ({ ...g, bukti: "" }));
  }

  function selesaikanTransaksi(e) {
    e.preventDefault();

    const galatBaru = {};
    if (!bukti) galatBaru.bukti = "Unggah bukti pembayaran terlebih dahulu.";
    if (!namaPenerima.trim()) galatBaru.nama = "Isi nama penerima.";
    setGalat(galatBaru);
    if (Object.keys(galatBaru).length > 0) return;

    // TODO: kirim `bukti` (file), `namaPenerima`, `pembayaran.idPesanan`,
    // dan `pembayaran.kodeKlaim` ke server / API milikmu di sini.

    const diperbarui = tandaiMenungguVerifikasi(namaPenerima.trim());

    // Produk yang dibayar dari keranjang dikeluarkan dari keranjang
    if (pembayaran.dariKeranjang) {
      new Set(pembayaran.item.map((b) => b.idProduk)).forEach(
        hapusDariKeranjang,
      );
    }

    setPembayaran(diperbarui);
  }

  return (
    <div className="pembayaran">
      <header className="pembayaran__header">
        <div className="pembayaran__header-isi">
          <button
            type="button"
            className="pembayaran__kembali"
            aria-label={menungguVerifikasi ? "Kembali ke beranda" : "Kembali"}
            onClick={kembali}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M20 12H4M10.5 5.5 4 12l6.5 6.5" />
            </svg>
          </button>
          <h1 className="pembayaran__judul-halaman">Detail Pembayaran</h1>
        </div>
      </header>

      {/* ----- belum ada pembayaran ----- */}
      {siap && !pembayaran && (
        <div className="pembayaran__kosong">
          <p>Belum ada pesanan yang akan dibayar.</p>
          <button
            type="button"
            className="pembayaran__tombol-kecil"
            onClick={() => router.push("/keranjang")}
          >
            Ke keranjang
          </button>
        </div>
      )}

      {/* ----- form pembayaran ----- */}
      {siap && pembayaran && !menungguVerifikasi && (
        <form
          className="pembayaran__isi"
          onSubmit={selesaikanTransaksi}
          noValidate
        >
          <section className="pembayaran__total">
            <p className="pembayaran__label">Total Pembayaran</p>
            <p className="pembayaran__total-harga">
              {formatHarga(pembayaran.total)}
            </p>
          </section>

          {/* Gambar QRIS dari data produk. Kalau kosong / gagal dimuat, tampil kotak abu-abu */}
          {pembayaran.qris && !qrisGagal ? (
            <img
              className="pembayaran__qris pembayaran__qris--gambar"
              src={pembayaran.qris}
              alt="Kode QRIS pembayaran"
              decoding="async"
              onError={() => setQrisGagal(true)}
            />
          ) : (
            <div
              className="pembayaran__qris"
              role="img"
              aria-label="Kode QRIS belum tersedia"
            />
          )}

          <div className="pembayaran__bidang">
            <p className="pembayaran__label" id="label-bukti">
              Masukan bukti pembayaran
            </p>
            <label
              className={
                "pembayaran__unggah" +
                (galat.bukti ? " pembayaran__unggah--galat" : "")
              }
            >
              <input
                className="pembayaran__input-berkas"
                type="file"
                accept="image/*"
                aria-labelledby="label-bukti"
                onChange={pilihBukti}
              />
              {urlPratinjau ? (
                <>
                  <img
                    className="pembayaran__pratinjau"
                    src={urlPratinjau}
                    alt="Pratinjau bukti pembayaran"
                  />
                  <span className="pembayaran__ganti">
                    Ketuk untuk mengganti
                  </span>
                </>
              ) : (
                <span className="pembayaran__petunjuk-unggah">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15" />
                  </svg>
                  Ketuk untuk memilih foto
                </span>
              )}
            </label>
            {galat.bukti && (
              <p className="pembayaran__galat" role="alert">
                {galat.bukti}
              </p>
            )}
          </div>

          <div className="pembayaran__bidang">
            <label className="pembayaran__label" htmlFor="nama-penerima">
              Nama Penerima
            </label>
            <input
              id="nama-penerima"
              className="pembayaran__input"
              type="text"
              autoComplete="name"
              value={namaPenerima}
              onChange={(e) => setNamaPenerima(e.target.value)}
              aria-invalid={galat.nama ? "true" : undefined}
            />
            {galat.nama && (
              <p className="pembayaran__galat" role="alert">
                {galat.nama}
              </p>
            )}
          </div>

          <dl className="pembayaran__kode">
            <div>
              <dt className="pembayaran__label">Code klaim</dt>
              <dd className="pembayaran__kode-nilai">{pembayaran.kodeKlaim}</dd>
            </div>
            <div>
              <dt className="pembayaran__label">Id Pesanan</dt>
              <dd className="pembayaran__kode-nilai">{pembayaran.idPesanan}</dd>
            </div>
          </dl>

          <div className="pembayaran__aksi">
            <button type="submit" className="pembayaran__tombol-selesai">
              Selesaikan Transaksi
            </button>
          </div>
        </form>
      )}

      {/* ----- menunggu verifikasi ----- */}
      {siap && pembayaran && menungguVerifikasi && (
        <section className="pembayaran__selesai" role="status">
          <div className="pembayaran__centang" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M5.5 12.5 10 17l8.5-9.5" />
            </svg>
          </div>

          <h2
            className="pembayaran__selesai-judul"
            ref={judulSelesaiRef}
            tabIndex={-1}
          >
            Orderanmu sedang menunggu verifikasi
          </h2>

          <p className="pembayaran__catatan">
            Jika pesanan belum juga diverifikasi sampai hari H, hubungi nomor
            ini untuk refund atau pengembalian dana.
          </p>

          <a
            className="pembayaran__wa"
            href={`https://wa.me/${NOMOR_WA_LINK}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Hubungi lewat WhatsApp ${NOMOR_WA_TAMPIL}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4 3.5V16h0.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
            </svg>
            {NOMOR_WA_TAMPIL}
          </a>
        </section>
      )}
    </div>
  );
}
