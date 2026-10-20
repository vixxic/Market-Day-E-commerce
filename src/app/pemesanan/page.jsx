"use client";

import "./pemesanan.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeranjangContext } from "@/context/KeranjangContext";
import { usePesananContext } from "@/context/PesananContext";
import { formatHarga } from "@/lib/formatHarga";

export default function PagePemesanan() {
  const router = useRouter();
  const {
    loading,
    pesananAktif: pemesanan,
    buatPesanan,
    error,
  } = usePesananContext();
  const { hapusDariKeranjang } = useKeranjangContext();
  const siap = !loading;

  const [namaPemesan, setNamaPemesan] = useState("");
  const [nomorPemesan, setNomorPemesan] = useState("");
  const [galat, setGalat] = useState("");
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const judulSelesaiRef = useRef(null);

  const menungguKonfirmasi = pemesanan?.status === "menunggu_konfirmasi";

  useEffect(() => {
    if (!menungguKonfirmasi) return;
    window.scrollTo(0, 0);
    judulSelesaiRef.current?.focus();
  }, [menungguKonfirmasi]);

  function kembali() {
    if (menungguKonfirmasi) router.push("/");
    else if (window.history.length > 1) router.back();
    else router.push("/keranjang");
  }

  async function selesaikanPemesanan(event) {
    event.preventDefault();
    const nama = namaPemesan.trim();
    const nomor = nomorPemesan.trim();
    const jumlahDigitNomor = nomor.replace(/\D/g, "").length;

    if (!nama) {
      setGalat("Isi nama pemesan.");
      return;
    }
    if (jumlahDigitNomor < 8 || jumlahDigitNomor > 15) {
      setGalat("Masukkan nomor pemesan yang valid (8–15 digit).");
      return;
    }

    setGalat("");
    setSedangMenyimpan(true);
    try {
      await buatPesanan(pemesanan, nama, nomor);
      if (pemesanan.dariKeranjang) {
        new Set(pemesanan.item.map((baris) => baris.idProduk)).forEach(
          hapusDariKeranjang,
        );
      }
    } catch (galatSimpan) {
      setGalat(galatSimpan.message);
    } finally {
      setSedangMenyimpan(false);
    }
  }

  return (
    <div className="pemesanan">
      <header className="pemesanan__header">
        <div className="pemesanan__header-isi">
          <button
            type="button"
            className="pemesanan__kembali"
            aria-label={menungguKonfirmasi ? "Kembali ke beranda" : "Kembali"}
            onClick={kembali}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M20 12H4M10.5 5.5 4 12l6.5 6.5" />
            </svg>
          </button>
          <h1 className="pemesanan__judul-halaman">Detail Pemesanan</h1>
        </div>
      </header>

      {siap && !pemesanan && (
        <div className="pemesanan__kosong">
          <p>Belum ada pesanan yang perlu dilengkapi.</p>
          <button
            type="button"
            className="pemesanan__tombol-kecil"
            onClick={() => router.push("/keranjang")}
          >
            Ke keranjang
          </button>
        </div>
      )}

      {siap && pemesanan && (!menungguKonfirmasi || sedangMenyimpan) && (
        <form
          className="pemesanan__isi"
          onSubmit={selesaikanPemesanan}
          noValidate
        >
          {(error || galat) && (
            <p className="pemesanan__galat" role="alert">
              {galat || error}
            </p>
          )}

          <section className="pemesanan__total">
            <p className="pemesanan__label">Total Pesanan</p>
            <p className="pemesanan__total-harga">
              {formatHarga(pemesanan.total)}
            </p>
          </section>

          <div className="pemesanan__bidang">
            <label className="pemesanan__label" htmlFor="nama-pemesan">
              Nama Pemesan
            </label>
            <input
              id="nama-pemesan"
              className="pemesanan__input"
              type="text"
              autoComplete="name"
              value={namaPemesan}
              onChange={(event) => setNamaPemesan(event.target.value)}
              aria-invalid={galat === "Isi nama pemesan." ? "true" : undefined}
              required
            />
          </div>

          <div className="pemesanan__bidang">
            <label className="pemesanan__label" htmlFor="nomor-pemesan">
              Nomor Pemesan
            </label>
            <input
              id="nomor-pemesan"
              className="pemesanan__input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="Contoh: 081234567890"
              value={nomorPemesan}
              onChange={(event) => setNomorPemesan(event.target.value)}
              aria-invalid={
                galat.includes("nomor pemesan") ? "true" : undefined
              }
              required
            />
          </div>

          <dl className="pemesanan__kode">
            <div>
              <dt className="pemesanan__label">Kode Klaim</dt>
              <dd className="pemesanan__kode-nilai">{pemesanan.kodeKlaim}</dd>
            </div>
            <div>
              <dt className="pemesanan__label">ID Pesanan</dt>
              <dd className="pemesanan__kode-nilai">{pemesanan.idPesanan}</dd>
            </div>
          </dl>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <p className="pemesanan__peringatan" role="note">
              Transaksi dilakukan langsung di tempat saat mengambil pesanan.
            </p>

            <div className="pemesanan__aksi">
              <button
                type="submit"
                className="pemesanan__tombol-selesai"
                disabled={sedangMenyimpan}
              >
                {sedangMenyimpan ? "Menyimpan..." : "Buat Pesanan"}
              </button>
            </div>
          </div>
        </form>
      )}

      {siap && pemesanan && menungguKonfirmasi && !sedangMenyimpan && (
        <section className="pemesanan__selesai" role="status">
          <div className="pemesanan__centang" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M5.5 12.5 10 17l8.5-9.5" />
            </svg>
          </div>
          <h2
            className="pemesanan__selesai-judul"
            ref={judulSelesaiRef}
            tabIndex={-1}
          >
            Pesanan berhasil dibuat
          </h2>
          <p className="pemesanan__catatan">
            Tunjukkan kode klaim ini kepada penjual saat mengambil pesanan.
          </p>
          <p className="pemesanan__kode-selesai">{pemesanan.kodeKlaim}</p>
          <button
            type="button"
            className="pemesanan__tombol-kecil"
            onClick={() => router.push("/pesanan")}
          >
            Lihat pesanan
          </button>
        </section>
      )}
    </div>
  );
}
