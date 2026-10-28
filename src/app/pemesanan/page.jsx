"use client";

import "./pemesanan.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeranjangContext } from "@/Context/KeranjangContext";
import { usePesananContext } from "@/Context/PesananContext";
import { simpanPesananLokal as perbaruiPesananLokal } from "@/lib/pesanan";
import { simpanPemesanan } from "@/lib/pemesanan";
import { formatHarga } from "@/lib/formatHarga";
import OtpInput from "./OtpInput";

function formatHitungMundur(detik) {
  const menit = Math.floor(detik / 60);
  const sisaDetik = detik % 60;
  return `${String(menit).padStart(2, "0")}:${String(sisaDetik).padStart(
    2,
    "0",
  )}`;
}

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
  const [tahapOtp, setTahapOtp] = useState(false);
  const [kodeOtp, setKodeOtp] = useState("");
  const [sedangKirimOtp, setSedangKirimOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [infoOtp, setInfoOtp] = useState("");

  const judulSelesaiRef = useRef(null);

  const menungguKonfirmasi = pemesanan?.status === "menunggu_konfirmasi";

  useEffect(() => {
    if (!menungguKonfirmasi) return;
    window.scrollTo(0, 0);
    judulSelesaiRef.current?.focus();
  }, [menungguKonfirmasi]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function kirimUlangOtp() {
    if (!pemesanan || cooldown > 0) return;
    setSedangKirimOtp(true);
    setGalat("");
    setInfoOtp("");
    try {
      const resp = await fetch("/api/otp/kirim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: pemesanan.idPesanan,
          phone: nomorPemesan || pemesanan.nomorPemesan,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setGalat(data.error ?? "Gagal mengirim ulang OTP.");
        return;
      }
      setCooldown(data.cooldown ?? 60);
      setKodeOtp("");
      setInfoOtp("Kode OTP baru telah dikirim ke WhatsApp Anda.");
    } catch (e) {
      setGalat("Gagal mengirim ulang OTP: " + e.message);
    } finally {
      setSedangKirimOtp(false);
    }
  }

  async function verifikasiOtp(event) {
    event.preventDefault();
    setGalat("");
    setInfoOtp("");
    if (kodeOtp.trim().length !== 6) {
      setGalat("Masukkan 6 digit kode OTP.");
      return;
    }
    setSedangMenyimpan(true);
    try {
      const resp = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: pemesanan.idPesanan,
          otp: kodeOtp.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setGalat(data.error);
        return;
      }
      const pesananTerverifikasi = {
        ...pemesanan,
        namaPemesan: namaPemesan || pemesanan.namaPemesan,
        nomorPemesan: nomorPemesan || pemesanan.nomorPemesan,
        status: "menunggu_konfirmasi",
      };
      simpanPemesanan(pesananTerverifikasi);
      perbaruiPesananLokal(pesananTerverifikasi);
    } catch (galatSimpan) {
      setGalat(galatSimpan.message);
    } finally {
      setSedangMenyimpan(false);
    }
  }

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
      const pesananTersimpan = await buatPesanan(pemesanan, nama, nomor);
      if (pemesanan.dariKeranjang) {
        new Set(pemesanan.item.map((baris) => baris.idProduk)).forEach(
          hapusDariKeranjang,
        );
      }
      // kirim OTP memakai ID pesanan yang dibuat server
      const kirimResp = await fetch("/api/otp/kirim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: pesananTersimpan?.idPesanan ?? pemesanan.idPesanan,
          phone: nomor,
        }),
      });
      const kirimData = await kirimResp.json();
      if (!kirimResp.ok) {
        setGalat(kirimData.error ?? "Gagal mengirim OTP. Coba kirim ulang.");
        setTahapOtp(true);
        return;
      }
      setTahapOtp(true);
      setCooldown(kirimData.cooldown ?? 60);
    } catch (galatSimpan) {
      setGalat(galatSimpan.message);
    } finally {
      setSedangMenyimpan(false);
    }
  }

  const nomorOtp = (nomorPemesan || pemesanan?.nomorPemesan || "").trim();

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
          {!(tahapOtp && !menungguKonfirmasi) && (
            <h1 className="pemesanan__judul-halaman">Detail Pemesanan</h1>
          )}
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

      {siap && pemesanan && !menungguKonfirmasi && !tahapOtp && (

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

      {siap && pemesanan && tahapOtp && !menungguKonfirmasi && (
        <form className="pemesanan__otp" onSubmit={verifikasiOtp} noValidate>
          <h1 className="pemesanan__otp-judul">Verifikasi OTP</h1>
          <p className="pemesanan__otp-subjudul">
            Kami telah mengirim kode verifikasi 6 digit ke nomor WhatsApp{" "}
            {nomorOtp ? (
              <strong className="pemesanan__otp-nomor">{nomorOtp}</strong>
            ) : (
              "pemesan"
            )}
            .
          </p>

          {(error || galat) && (
            <p className="pemesanan__galat" role="alert">
              {galat || error}
            </p>
          )}

          <OtpInput
            nilai={kodeOtp}
            onUbah={setKodeOtp}
            nonaktif={sedangMenyimpan}
          />

          <button
            type="submit"
            className="pemesanan__otp-tombol"
            disabled={sedangMenyimpan}
          >
            {sedangMenyimpan ? "Memverifikasi..." : "Verifikasi OTP"}
          </button>

          {cooldown > 0 && (
            <p className="pemesanan__otp-timer">
              Kirim ulang kode dalam{" "}
              <strong>{formatHitungMundur(cooldown)}</strong>
            </p>
          )}

          {infoOtp && (
            <p className="pemesanan__otp-info" role="status">
              {infoOtp}
            </p>
          )}

          <p className="pemesanan__otp-kirim-ulang">
            Belum menerima kode OTP?{" "}
            <button
              type="button"
              className="pemesanan__otp-tautan"
              disabled={sedangKirimOtp || cooldown > 0}
              onClick={kirimUlangOtp}
            >
              {sedangKirimOtp ? "Mengirim..." : "Kirim ulang OTP"}
            </button>
          </p>
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
