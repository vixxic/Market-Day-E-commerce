"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiCalendar,
  FiClock,
  FiEdit,
  FiExternalLink,
  FiEye,
  FiGrid,
  FiInbox,
  FiLogOut,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShoppingBag,
  FiTrash2,
  FiTrendingUp,
  FiUser,
} from "react-icons/fi";
import { MdStorefront } from "react-icons/md";

import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import NavigasiBawah from "@/components/NavigasiBawah/NavigasiBawah";
import PopupKonfirmasi from "@/components/PopupKonfirmasi/PopupKonfirmasi";
import { useNotifikasi } from "@/components/Notifikasi/Notifikasi";
import { useAuthContext } from "@/Context/AuthContext";
import { formatHarga } from "@/lib/formatHarga";
import {
  gambarProduk,
  normalisasiPesananToko,
  PESAN_GALAT,
  PESAN_GALAT_HAPUS,
  pesanGalat,
  permintaanKelolaToko,
} from "@/lib/kelolaTokoClient";
import "./dashboardToko.css";

const STATUS_DITERIMA = new Set(["diproses", "selesai", "terverifikasi"]);
const WARNA_STATUS = {
  menunggu_konfirmasi: "#c04040",
  diproses: "#832828",
  selesai: "#521014",
  ditolak: "#d9b3b3",
};

function inisial(nama) {
  return String(nama ?? "Toko")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join("")
    .toUpperCase();
}

function angka(nilai) {
  return new Intl.NumberFormat("id-ID").format(Number(nilai) || 0);
}

function rupiahRingkas(nilai) {
  const jumlah = Number(nilai) || 0;
  if (jumlah >= 1_000_000) {
    return `Rp ${(jumlah / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} jt`;
  }
  if (jumlah >= 1_000) {
    return `Rp ${Math.round(jumlah / 1_000).toLocaleString("id-ID")} rb`;
  }
  return `Rp ${Math.round(jumlah).toLocaleString("id-ID")}`;
}

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

function jalurHalus(titik) {
  if (titik.length === 0) return "";
  if (titik.length === 1) return `M ${titik[0].x} ${titik[0].y}`;

  let jalur = `M ${titik[0].x} ${titik[0].y}`;
  for (let posisi = 0; posisi < titik.length - 1; posisi += 1) {
    const sebelum = titik[posisi - 1] ?? titik[posisi];
    const awal = titik[posisi];
    const akhir = titik[posisi + 1];
    const sesudah = titik[posisi + 2] ?? akhir;

    const kontrol1x = awal.x + (akhir.x - sebelum.x) / 6;
    const kontrol1y = awal.y + (akhir.y - sebelum.y) / 6;
    const kontrol2x = akhir.x - (sesudah.x - awal.x) / 6;
    const kontrol2y = akhir.y - (sesudah.y - awal.y) / 6;

    jalur += ` C ${kontrol1x} ${kontrol1y} ${kontrol2x} ${kontrol2y} ${akhir.x} ${akhir.y}`;
  }
  return jalur;
}

/**
 * Membandingkan pendapatan pesanan diterima tujuh hari terakhir dengan
 * tujuh hari sebelumnya. Rentang diambil dari tanggal terakhir grafik agar
 * tidak bergantung pada jam saat render. Mengembalikan null bila belum ada
 * pembanding.
 */
function hitungTren(pesanan, grafik) {
  if (!Array.isArray(grafik) || grafik.length === 0) return null;

  const akhir = new Date(`${grafik[grafik.length - 1].tanggal}T00:00:00Z`);
  if (Number.isNaN(akhir.getTime())) return null;

  const terbaruSet = new Set();
  const sebelumnyaSet = new Set();
  for (let posisi = 0; posisi < 14; posisi += 1) {
    const tanggal = new Date(akhir);
    tanggal.setUTCDate(tanggal.getUTCDate() - posisi);
    const kunci = tanggal.toISOString().slice(0, 10);
    if (posisi < 7) terbaruSet.add(kunci);
    else sebelumnyaSet.add(kunci);
  }

  let terbaru = 0;
  let sebelumnya = 0;

  for (const item of pesanan) {
    if (!STATUS_DITERIMA.has(item.status)) continue;
    const kunci = String(item.created_at ?? "").slice(0, 10);

    if (terbaruSet.has(kunci)) terbaru += Number(item.total) || 0;
    else if (sebelumnyaSet.has(kunci)) sebelumnya += Number(item.total) || 0;
  }

  if (sebelumnya <= 0) return null;
  return ((terbaru - sebelumnya) / sebelumnya) * 100;
}

function GrafikPendapatan({ grafik }) {
  const [aktif, setAktif] = useState(null);

  const jumlah = grafik.length;
  const nilai = grafik.map((hari) => Number(hari.pendapatan) || 0);
  const puncak = Math.max(...nilai, 1);
  const maks = Math.max(1000, Math.ceil(puncak / 1000) * 1000);

  const lebarSvg = 720;
  const tinggiSvg = 240;
  const pad = { atas: 34, kanan: 10, bawah: 14, kiri: 56 };
  const lebarPlot = lebarSvg - pad.kiri - pad.kanan;
  const tinggiPlot = tinggiSvg - pad.atas - pad.bawah;

  const titik = nilai.map((jumlahHari, posisi) => ({
    x:
      pad.kiri +
      (jumlah === 1 ? lebarPlot / 2 : (posisi * lebarPlot) / (jumlah - 1)),
    y: pad.atas + tinggiPlot * (1 - jumlahHari / maks),
    nilai: jumlahHari,
  }));

  const indeks = aktif ?? jumlah - 1;
  const terpilih = titik[indeks] ?? titik[0];
  const garis = jalurHalus(titik);
  const area =
    titik.length > 0
      ? `${garis} L ${titik[titik.length - 1].x} ${pad.atas + tinggiPlot} L ${
          titik[0].x
        } ${pad.atas + tinggiPlot} Z`
      : "";

  const totalPeriode = nilai.reduce((total, item) => total + item, 0);
  const pesananPeriode = grafik.reduce(
    (total, hari) => total + (Number(hari.pesanan) || 0),
    0,
  );
  const hariTerbaik = grafik.reduce(
    (terbaik, hari, posisi) =>
      nilai[posisi] > terbaik.nilai
        ? { hari, nilai: nilai[posisi] }
        : terbaik,
    { hari: grafik[0], nilai: nilai[0] ?? 0 },
  );

  function pilihDariPosisi(peristiwa) {
    const kotak = peristiwa.currentTarget.getBoundingClientRect();
    if (!kotak.width) return;
    const rasio = Math.min(
      1,
      Math.max(0, (peristiwa.clientX - kotak.left) / kotak.width),
    );
    const posisi = ((rasio * lebarSvg - pad.kiri) / lebarPlot) * (jumlah - 1);
    setAktif(Math.min(jumlah - 1, Math.max(0, Math.round(posisi))));
  }

  return (
    <>
      <div className="dasbor-grafik__plot">
        {aktif !== null && (
          <div
            className="dasbor-grafik__tooltip"
            style={{
              left: `clamp(64px, ${(terpilih.x / lebarSvg) * 100}%, calc(100% - 64px))`,
            }}
          >
            <span>{labelHari(grafik[indeks]?.tanggal)}</span>
            <strong>{formatHarga(terpilih.nilai)}</strong>
          </div>
        )}

      <svg
        className="dasbor-grafik__svg"
        viewBox={`0 0 ${lebarSvg} ${tinggiSvg}`}
        role="img"
        aria-label="Grafik pendapatan tujuh hari terakhir"
        onMouseMove={pilihDariPosisi}
        onMouseLeave={() => setAktif(null)}
      >
        <defs>
          <linearGradient id="dasbor-gradien-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#832828" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#832828" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((bagian) => {
          const posisiY = pad.atas + tinggiPlot * (1 - bagian);
          return (
            <line
              key={bagian}
              className="dasbor-grafik__garis-grid"
              x1={pad.kiri}
              x2={lebarSvg - pad.kanan}
              y1={posisiY}
              y2={posisiY}
            />
          );
        })}

        <path d={area} fill="url(#dasbor-gradien-area)" />
        <path className="dasbor-grafik__garis" d={garis} fill="none" />

        <line
          className="dasbor-grafik__penunjuk"
          x1={terpilih.x}
          x2={terpilih.x}
          y1={terpilih.y}
          y2={pad.atas + tinggiPlot}
        />

        {titik.map((t, posisi) => (
          <circle
            key={posisi}
            className={
              "dasbor-grafik__titik" +
              (posisi === indeks ? " dasbor-grafik__titik--aktif" : "")
            }
            cx={t.x}
            cy={t.y}
            r={posisi === indeks ? 4.6 : 3}
          />
        ))}
      </svg>

      <div
        className="dasbor-grafik__sumbu-y"
        aria-hidden="true"
        style={{
          top: `${(pad.atas / tinggiSvg) * 100}%`,
          height: `${(tinggiPlot / tinggiSvg) * 100}%`,
        }}
      >
        {[1, 0.5, 0].map((bagian) => (
          <span
            key={bagian}
            style={{ top: `${(1 - bagian) * 100}%` }}
          >
            {rupiahRingkas(maks * bagian)}
          </span>
        ))}
      </div>

        <div className="dasbor-grafik__sumbu-x" aria-hidden="true">
          {titik.map((t, posisi) => (
            <span
              key={grafik[posisi].tanggal}
              style={{ left: `${(t.x / lebarSvg) * 100}%` }}
            >
              {labelTanggal(grafik[posisi].tanggal)}
            </span>
          ))}
        </div>
      </div>

      <div className="dasbor-grafik__kaki">
        <div className="dasbor-grafik__kaki-butir">
          <span>Rata-rata / hari</span>
          <strong>{rupiahRingkas(totalPeriode / Math.max(1, jumlah))}</strong>
        </div>
        <div className="dasbor-grafik__kaki-butir">
          <span>Pesanan</span>
          <strong>{angka(pesananPeriode)}</strong>
        </div>
        <div className="dasbor-grafik__kaki-butir">
          <span>Hari terbaik</span>
          <strong>
            {labelHari(hariTerbaik.hari.tanggal)} ·{" "}
            {rupiahRingkas(hariTerbaik.nilai)}
          </strong>
        </div>
      </div>
    </>
  );
}

function Kerangka({ className = "", style }) {
  return (
    <span
      className={`dasbor-skel${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}

function KerangkaDaftar({ jumlah = 4, thumb = true }) {
  return (
    <div className="dasbor-skel-daftar" aria-hidden="true">
      {Array.from({ length: jumlah }, (_, posisi) => (
        <div className="dasbor-skel-daftar__baris" key={posisi}>
          {thumb && <Kerangka className="dasbor-skel--thumb" />}
          <Kerangka
            className="dasbor-skel--nama"
            style={{ width: `${64 - posisi * 5}%` }}
          />
          <Kerangka className="dasbor-skel--angka" />
        </div>
      ))}
    </div>
  );
}

function KerangkaGrafik() {
  const tinggi = [38, 62, 44, 72, 55, 84, 68];

  return (
    <div className="dasbor-skel-grafik" aria-hidden="true">
      {tinggi.map((nilai, posisi) => (
        <span
          key={posisi}
          className="dasbor-skel dasbor-skel--balok"
          style={{ height: `${nilai}%` }}
        />
      ))}
    </div>
  );
}

export default function DashboardToko() {
  const { toko, keluar } = useAuthContext();
  const router = useRouter();
  const notifikasi = useNotifikasi();

  const [produk, setProduk] = useState([]);
  const [pesanan, setPesanan] = useState([]);
  const [analitik, setAnalitik] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memuatAnalitik, setMemuatAnalitik] = useState(true);
  const [error, setError] = useState("");
  const [errorAnalitik, setErrorAnalitik] = useState("");
  const [mengeluarkan, setMengeluarkan] = useState(false);
  const [hapusId, setHapusId] = useState(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  const [cari, setCari] = useState("");

  useEffect(() => {
    let aktif = true;
    let sedangMemuat = false;

    async function muatData(tampilkanLoading = false) {
      if (sedangMemuat) return;
      sedangMemuat = true;
      if (tampilkanLoading) setLoading(true);

      try {
        const [daftarProduk, daftarPesanan, dataAnalitik] = await Promise.all([
          permintaanKelolaToko("/api/toko/produk"),
          permintaanKelolaToko("/api/toko/pesanan"),
          permintaanKelolaToko("/api/toko/analitik").catch((galat) => {
            if (aktif) setErrorAnalitik(pesanGalat(galat));
            return null;
          }),
        ]);
        if (!aktif) return;
        setProduk(daftarProduk);
        setPesanan(daftarPesanan.map(normalisasiPesananToko));
        if (dataAnalitik) {
          setAnalitik(dataAnalitik);
          setErrorAnalitik("");
        }
        setError("");
      } catch (galat) {
        if (aktif) setError(pesanGalat(galat));
      } finally {
        sedangMemuat = false;
        if (aktif) {
          setMemuatAnalitik(false);
          if (tampilkanLoading) setLoading(false);
        }
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
      setProduk((sebelumnya) =>
        sebelumnya.filter((item) => item.id !== hapusId),
      );
      notifikasi.sukses("Produk sudah dihapus dari toko.", {
        judul: "Produk dihapus",
      });
    } catch {
      notifikasi.galat(PESAN_GALAT_HAPUS, { judul: "Gagal menghapus" });
    } finally {
      setSedangHapus(false);
      setHapusId(null);
    }
  }

  async function logout() {
    setMengeluarkan(true);
    try {
      await keluar();
      router.replace("/masuktoko");
    } catch (galat) {
      notifikasi.galat(pesanGalat(galat), { judul: "Gagal keluar" });
      setMengeluarkan(false);
    }
  }

  const ringkasan = analitik?.ringkasan ?? {};
  const grafik = Array.isArray(analitik?.grafik) ? analitik.grafik : [];
  const produkTeratas = analitik?.produkTeratas ?? [];
  const palingDilihat = analitik?.palingDilihat ?? [];
  const totalGrafik = grafik.reduce(
    (total, hari) => total + (Number(hari.pendapatan) || 0),
    0,
  );
  const konversi = Math.min(
    100,
    Math.max(0, Number(ringkasan.konversi) || 0),
  );

  const jumlahStatus = useMemo(() => {
    const hasil = {
      menunggu_konfirmasi: 0,
      diproses: 0,
      selesai: 0,
      ditolak: 0,
    };
    for (const item of pesanan) {
      if (item.status === "terverifikasi") hasil.selesai += 1;
      else if (item.status in hasil) hasil[item.status] += 1;
    }
    return hasil;
  }, [pesanan]);

  const menunggu = jumlahStatus.menunggu_konfirmasi;
  const diterima = jumlahStatus.diproses;
  const selesai = jumlahStatus.selesai;
  const ditolak = jumlahStatus.ditolak;
  const totalPesanan = pesanan.length;

  const barisStatus = [
    {
      kunci: "menunggu_konfirmasi",
      label: "Menunggu konfirmasi",
      jumlah: menunggu,
      warna: WARNA_STATUS.menunggu_konfirmasi,
    },
    {
      kunci: "diproses",
      label: "Diproses",
      jumlah: diterima,
      warna: WARNA_STATUS.diproses,
    },
    {
      kunci: "selesai",
      label: "Selesai",
      jumlah: selesai,
      warna: WARNA_STATUS.selesai,
    },
    {
      kunci: "ditolak",
      label: "Ditolak",
      jumlah: ditolak,
      warna: WARNA_STATUS.ditolak,
    },
  ];

  const tren = hitungTren(pesanan, grafik);

  const terjualMap = useMemo(() => {
    const peta = new Map();
    for (const order of pesanan) {
      for (const baris of order.item ?? []) {
        const kunci = String(baris.id_produk ?? baris.id ?? "");
        if (!kunci) continue;
        peta.set(kunci, (peta.get(kunci) ?? 0) + Number(baris.jumlah || 0));
      }
    }
    return peta;
  }, [pesanan]);

  const produkTersaring = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return produk;
    return produk.filter((item) =>
      String(item.nama ?? "")
        .toLowerCase()
        .includes(kunci),
    );
  }, [produk, cari]);

  const namaToko = toko?.namaToko ?? "Toko";
  const tautanToko = toko ? `/toko/${toko.id}` : "/";
  const nilaiTren = tren === null ? null : tren.toFixed(1);
  const memuatKpi = loading || memuatAnalitik;

  return (
    <KelolaLayout tanpaHeader lebarPenuh>
      <div className="dasbor" aria-busy={loading || memuatAnalitik}>
        <span className="dasbor__sr" role="status">
          {loading || memuatAnalitik
            ? "Memuat data dashboard"
            : "Data dashboard siap"}
        </span>
        <aside className="dasbor__sidebar">
          <Link className="dasbor__brand" href="/kelolatoko">
            <span className="dasbor__brand-logo" aria-hidden="true">
              {inisial(namaToko)}
            </span>
            <span className="dasbor__brand-teks">
              <strong>{namaToko}</strong>
              <small>Market Day</small>
            </span>
          </Link>

          <nav className="dasbor__nav" aria-label="Navigasi toko">
            <div className="dasbor__nav-grup">
              <p className="dasbor__nav-label">Utama</p>
              <Link
                className="dasbor__nav-item dasbor__nav-item--aktif"
                href="/kelolatoko"
                aria-current="page"
              >
                <span className="dasbor__nav-ikon" aria-hidden="true">
                  <FiGrid />
                </span>
                Dashboard
              </Link>
              <Link className="dasbor__nav-item" href="/kelolatoko/pesanan">
                <span className="dasbor__nav-ikon" aria-hidden="true">
                  <FiInbox />
                </span>
                Pesanan masuk
                {menunggu > 0 && (
                  <span className="dasbor__nav-badge">{menunggu}</span>
                )}
              </Link>
              <Link
                className="dasbor__nav-item"
                href="/kelolatoko/pesanan-diterima"
              >
                <span className="dasbor__nav-ikon" aria-hidden="true">
                  <FiPackage />
                </span>
                Pesanan diterima
                {diterima > 0 && (
                  <span className="dasbor__nav-badge">{diterima}</span>
                )}
              </Link>
              <Link className="dasbor__nav-item" href="/kelolatoko/riwayat">
                <span className="dasbor__nav-ikon" aria-hidden="true">
                  <FiClock />
                </span>
                Riwayat pesanan
              </Link>
            </div>

            <div className="dasbor__nav-grup">
              <p className="dasbor__nav-label">Toko</p>
              <a className="dasbor__nav-item" href="#produk">
                <span className="dasbor__nav-ikon" aria-hidden="true">
                  <FiShoppingBag />
                </span>
                Produk
                {produk.length > 0 && (
                  <span className="dasbor__nav-badge">{produk.length}</span>
                )}
              </a>
              <Link
                className="dasbor__nav-item"
                href="/kelolatoko/profil"
              >
                <span className="dasbor__nav-ikon" aria-hidden="true">
                  <FiUser />
                </span>
                Profil toko
              </Link>
              <Link
                className="dasbor__nav-item"
                href={tautanToko}
                target="_blank"
                rel="noreferrer"
              >
                <span className="dasbor__nav-ikon" aria-hidden="true">
                  <FiExternalLink />
                </span>
                Lihat toko
              </Link>
            </div>
          </nav>

          <div className="dasbor__promo">
            <span className="dasbor__promo-ikon" aria-hidden="true">
              <MdStorefront />
            </span>
            <strong>Toko siap dilihat pembeli</strong>
            <p>Atur foto, banner, dan deskripsi yang tampil di halaman tokomu.</p>
            <Link className="dasbor__promo-tombol" href="/kelolatoko/profil">
              Atur profil
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>

          <div className="dasbor__sidebar-kaki">
            <button
              type="button"
              className="dasbor__nav-item dasbor__keluar"
              onClick={logout}
              disabled={mengeluarkan}
            >
              <span className="dasbor__nav-ikon" aria-hidden="true">
                <FiLogOut />
              </span>
              {mengeluarkan ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </aside>

        <div className="dasbor__utama">
          <div className="dasbor__mobilebar">
            <Link className="dasbor__brand" href="/kelolatoko">
              <span className="dasbor__brand-logo" aria-hidden="true">
                {inisial(namaToko)}
              </span>
              <span className="dasbor__brand-teks">
                <strong>{namaToko}</strong>
                <small>Market Day</small>
              </span>
            </Link>
            <div className="dasbor__mobilebar-aksi">
              <Link
                className="dasbor__ikon-tombol"
                href="/kelolatoko/profil"
                aria-label="Atur profil toko"
              >
                <FiUser aria-hidden="true" />
              </Link>
              <button
                type="button"
                className="dasbor__ikon-tombol"
                onClick={logout}
                aria-label="Keluar dari toko"
                disabled={mengeluarkan}
              >
                <FiLogOut aria-hidden="true" />
              </button>
            </div>
          </div>

          <header className="dasbor__topbar">
            <div className="dasbor__sapaan">
              <p className="dasbor__eyebrow">Dashboard toko</p>
              <h1>Halo, {namaToko}</h1>
              <p className="dasbor__sub">
                Ringkasan performa tokomu dan pesanan yang perlu ditangani.
              </p>
            </div>

            <div className="dasbor__alat">
              <label className="dasbor__cari">
                <FiSearch aria-hidden="true" />
                <input
                  type="search"
                  value={cari}
                  onChange={(peristiwa) => setCari(peristiwa.target.value)}
                  placeholder="Cari produk..."
                  aria-label="Cari produk"
                />
              </label>
              <span className="dasbor__chip">
                <FiCalendar aria-hidden="true" />
                7 hari terakhir
              </span>
              <Link
                className="dasbor__tambah-produk"
                href="/kelolatoko/produk/tambah"
              >
                <FiPlus aria-hidden="true" />
                Tambah produk
              </Link>
            </div>
          </header>

          {(error || errorAnalitik) && (
            <p className="kelola-toko__galat" role="alert">
              {error || errorAnalitik || PESAN_GALAT}
            </p>
          )}

          <div className="dasbor__grid-kpi">
            <article className="dasbor-kartu dasbor-kpi">
              <div className="dasbor-kpi__atas">
                <span className="dasbor-kpi__label">Pendapatan</span>
                <span className="dasbor-kpi__ikon" aria-hidden="true">
                  <FiTrendingUp />
                </span>
              </div>
              {memuatKpi ? (
                <Kerangka className="dasbor-skel--nilai" />
              ) : (
                <strong title={formatHarga(ringkasan.totalPendapatan)}>
                  {rupiahRingkas(ringkasan.totalPendapatan)}
                </strong>
              )}
              <div className="dasbor-kpi__bawah">
                {memuatKpi ? (
                  <Kerangka className="dasbor-skel--pil" />
                ) : nilaiTren !== null ? (
                  <span
                    className={
                      "dasbor-kpi__tren" +
                      (tren < 0 ? " dasbor-kpi__tren--turun" : "")
                    }
                  >
                    {tren < 0 ? (
                      <FiArrowDownRight aria-hidden="true" />
                    ) : (
                      <FiArrowUpRight aria-hidden="true" />
                    )}
                    {Math.abs(Number(nilaiTren))}%
                  </span>
                ) : (
                  <span className="dasbor-kpi__tren dasbor-kpi__tren--netral">
                    Total
                  </span>
                )}
                {!memuatKpi && (
                  <span className="dasbor-kpi__ket">
                    {nilaiTren !== null ? "vs 7 hari lalu" : "pesanan diterima"}
                  </span>
                )}
              </div>
            </article>

            <article className="dasbor-kartu dasbor-kpi">
              <div className="dasbor-kpi__atas">
                <span className="dasbor-kpi__label">Pesanan diterima</span>
                <span className="dasbor-kpi__ikon" aria-hidden="true">
                  <FiPackage />
                </span>
              </div>
              {memuatKpi ? (
                <Kerangka className="dasbor-skel--nilai" />
              ) : (
                <strong>{angka(ringkasan.pesananDiterima)}</strong>
              )}
              <div className="dasbor-kpi__bawah">
                {memuatKpi ? (
                  <Kerangka className="dasbor-skel--pil" />
                ) : (
                  <>
                    <span
                      className={
                        "dasbor-kpi__tren" +
                        (menunggu > 0 ? " dasbor-kpi__tren--perhatian" : "")
                      }
                    >
                      {menunggu > 0 ? `${menunggu} baru` : "Beres"}
                    </span>
                    <span className="dasbor-kpi__ket">
                      {menunggu > 0
                        ? "menunggu konfirmasi"
                        : "tidak ada antrean"}
                    </span>
                  </>
                )}
              </div>
            </article>

            <article className="dasbor-kartu dasbor-kpi">
              <div className="dasbor-kpi__atas">
                <span className="dasbor-kpi__label">Produk terjual</span>
                <span className="dasbor-kpi__ikon" aria-hidden="true">
                  <FiShoppingBag />
                </span>
              </div>
              {memuatKpi ? (
                <Kerangka className="dasbor-skel--nilai" />
              ) : (
                <strong>{angka(ringkasan.produkTerjual)}</strong>
              )}
              <div className="dasbor-kpi__bawah">
                {memuatKpi ? (
                  <Kerangka className="dasbor-skel--pil" />
                ) : (
                  <>
                    <span className="dasbor-kpi__tren dasbor-kpi__tren--netral">
                      {angka(selesai)} selesai
                    </span>
                    <span className="dasbor-kpi__ket">pesanan tuntas</span>
                  </>
                )}
              </div>
            </article>

            <article className="dasbor-kartu dasbor-kpi">
              <div className="dasbor-kpi__atas">
                <span className="dasbor-kpi__label">Produk dilihat</span>
                <span className="dasbor-kpi__ikon" aria-hidden="true">
                  <FiEye />
                </span>
              </div>
              {memuatKpi ? (
                <Kerangka className="dasbor-skel--nilai" />
              ) : (
                <strong>{angka(ringkasan.totalDilihat)}</strong>
              )}
              <div className="dasbor-kpi__bawah">
                {memuatKpi ? (
                  <Kerangka className="dasbor-skel--pil" />
                ) : (
                  <>
                    <span className="dasbor-kpi__tren dasbor-kpi__tren--netral">
                      {konversi.toFixed(1)}% konversi
                    </span>
                    <span className="dasbor-kpi__ket">kunjungan 30 hari</span>
                  </>
                )}
              </div>
            </article>
          </div>

          <div className="dasbor__grid-utama">
            <article className="dasbor-kartu dasbor-grafik">
              <div className="dasbor-kartu__kepala">
                <div>
                  <h3>Pendapatan</h3>
                  <p>Tujuh hari terakhir</p>
                </div>
                {memuatAnalitik ? (
                  <Kerangka className="dasbor-skel--pil" />
                ) : (
                  <div className="dasbor-grafik__ringkas">
                    <strong title={formatHarga(totalGrafik)}>
                      {rupiahRingkas(totalGrafik)}
                    </strong>
                    <span className="dasbor-grafik__lencana">7 hari</span>
                  </div>
                )}
              </div>

              {memuatAnalitik ? (
                <KerangkaGrafik />
              ) : grafik.length === 0 ? (
                <p className="dasbor-kosong">Belum ada data pendapatan.</p>
              ) : (
                <GrafikPendapatan grafik={grafik} />
              )}
            </article>

            <article className="dasbor-kartu dasbor-konversi">
                <div className="dasbor-kartu__kepala">
                  <div>
                    <h3>Tingkat konversi</h3>
                    <p>Kunjungan menjadi pesanan</p>
                  </div>
                </div>

                {memuatAnalitik ? (
                  <div className="dasbor-skel-konversi" aria-hidden="true">
                    <Kerangka className="dasbor-skel--cincin" />
                    <Kerangka className="dasbor-skel--garis" />
                    <Kerangka className="dasbor-skel--garis dasbor-skel--pendek" />
                  </div>
                ) : (
                  <>
                    <div
                      className="dasbor-konversi__cincin"
                      style={{ "--nilai": `${konversi}%` }}
                      role="img"
                      aria-label={`Tingkat konversi ${konversi.toFixed(1)} persen`}
                    >
                      <div className="dasbor-konversi__inti">
                        <strong>{konversi.toFixed(1)}%</strong>
                        <span>konversi</span>
                      </div>
                    </div>

                    <p className="dasbor-konversi__catatan">
                      {angka(ringkasan.pesananDiterima)} pesanan diterima dari{" "}
                      {angka(ringkasan.totalDilihat)} kunjungan produk.
                    </p>

                    {analitik && !analitik.viewsTersedia && (
                      <p className="dasbor-konversi__info">
                        Statistik kunjungan belum aktif. Jalankan migrasi{" "}
                        <code>
                          20261028120000_add_store_profiles_and_analytics.sql
                        </code>{" "}
                        untuk mencatat kunjungan.
                      </p>
                    )}
                  </>
                )}
              </article>

              <article className="dasbor-kartu dasbor-status">
                <div className="dasbor-kartu__kepala">
                  <div>
                    <h3>Status pesanan</h3>
                    <p>Seluruh pesanan tokomu</p>
                  </div>
                  {!loading && (
                    <span className="dasbor-status__total">
                      {angka(totalPesanan)}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="dasbor-skel-status" aria-hidden="true">
                    <Kerangka
                      className="dasbor-skel--bar"
                      style={{ height: "10px" }}
                    />
                    <KerangkaDaftar jumlah={4} thumb={false} />
                  </div>
                ) : totalPesanan === 0 ? (
                  <p className="dasbor-kosong">Belum ada pesanan masuk.</p>
                ) : (
                  <>
                    <div
                      className="dasbor-status__bar"
                      aria-hidden="true"
                    >
                      {barisStatus
                        .filter((baris) => baris.jumlah > 0)
                        .map((baris) => (
                          <span
                            key={baris.kunci}
                            style={{
                              flexGrow: baris.jumlah,
                              background: baris.warna,
                            }}
                          />
                        ))}
                    </div>

                    <ul className="dasbor-status__daftar">
                      {barisStatus.map((baris) => (
                        <li key={baris.kunci}>
                          <span
                            className="dasbor-status__titik"
                            style={{ background: baris.warna }}
                            aria-hidden="true"
                          />
                          <span>{baris.label}</span>
                          <strong>{angka(baris.jumlah)}</strong>
                          <span className="dasbor-status__persen">
                            {Math.round((baris.jumlah / totalPesanan) * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <Link className="dasbor-status__tautan" href="/kelolatoko/pesanan">
                  Kelola pesanan
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
              </article>
          </div>

          <div className="dasbor__grid-bawah">
            <article className="dasbor-kartu dasbor-terlaris">
              <div className="dasbor-kartu__kepala">
                <div>
                  <h3>Produk terlaris</h3>
                  <p>Berdasarkan jumlah terjual</p>
                </div>
              </div>

              {memuatAnalitik ? (
                <KerangkaDaftar jumlah={5} />
              ) : produkTeratas.length === 0 ? (
                <p className="dasbor-kosong">
                  Belum ada produk terjual pada periode ini.
                </p>
              ) : (
                <div className="dasbor-tabel-wadah">
                  <table className="dasbor-tabel">
                    <thead>
                      <tr>
                        <th scope="col">Produk</th>
                        <th scope="col">Terjual</th>
                        <th scope="col" className="dasbor-tabel__dilihat">
                          Dilihat
                        </th>
                        <th scope="col">Pendapatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produkTeratas.map((item, posisi) => (
                        <tr key={item.id ?? item.nama}>
                          <td>
                            <div className="dasbor-tabel__produk">
                              <span className="dasbor-tabel__nomor">
                                {posisi + 1}
                              </span>
                              <span className="dasbor-tabel__thumb">
                                {item.gambar ? (
                                  <img src={item.gambar} alt="" loading="lazy" />
                                ) : (
                                  <FiShoppingBag aria-hidden="true" />
                                )}
                              </span>
                              <span className="dasbor-tabel__nama">
                                {item.nama}
                              </span>
                            </div>
                          </td>
                          <td>{angka(item.jumlah)}</td>
                          <td className="dasbor-tabel__dilihat">
                            {angka(item.dilihat)}
                          </td>
                          <td className="dasbor-tabel__nominal">
                            {formatHarga(item.pendapatan)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="dasbor-kartu dasbor-dilihat">
              <div className="dasbor-kartu__kepala">
                <div>
                  <h3>Paling banyak dilihat</h3>
                  <p>Minat pembeli pada produkmu</p>
                </div>
              </div>

              {memuatAnalitik ? (
                <KerangkaDaftar jumlah={5} />
              ) : palingDilihat.length === 0 ? (
                <p className="dasbor-kosong">
                  Belum ada data kunjungan produk.
                </p>
              ) : (
                <ol className="dasbor-dilihat__daftar">
                  {palingDilihat.map((item, posisi) => (
                    <li key={item.id ?? item.nama}>
                      <span className="dasbor-dilihat__nomor">
                        {posisi + 1}
                      </span>
                      <span className="dasbor-dilihat__thumb">
                        {item.gambar ? (
                          <img src={item.gambar} alt="" loading="lazy" />
                        ) : (
                          <FiEye aria-hidden="true" />
                        )}
                      </span>
                      <span className="dasbor-dilihat__teks">
                        <strong>{item.nama}</strong>
                        <small>{angka(item.dilihat)} kali dilihat</small>
                      </span>
                      <span className="dasbor-dilihat__nilai">
                        <FiEye aria-hidden="true" />
                        {angka(item.dilihat)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {!memuatAnalitik && (
                <p className="dasbor-dilihat__kaki">
                  {angka(ringkasan.totalDilihat)} kunjungan dalam 30 hari
                  terakhir.
                </p>
              )}
            </article>
          </div>

          <section className="dasbor__bagian" id="produk">
            <div className="dasbor__bagian-kepala">
              <div>
                <h2>
                  Produk kamu
                  {!loading && (
                    <span className="dasbor__jumlah-pil">
                      {angka(produk.length)}
                    </span>
                  )}
                </h2>
                <p>
                  Kelola stok, harga, dan pesanan tiap produk dalam satu tempat.
                </p>
              </div>
              <Link
                className="dasbor__tautan-ringan"
                href="/kelolatoko/produk/tambah"
              >
                <FiPlus aria-hidden="true" />
                Produk baru
              </Link>
            </div>

            {loading ? (
              <div className="dasbor-produk-grid" aria-hidden="true">
                {Array.from({ length: 5 }, (_, posisi) => (
                  <div className="dasbor-skel-kartu" key={posisi}>
                    <Kerangka className="dasbor-skel--foto" />
                    <div className="dasbor-skel-kartu__isi">
                      <Kerangka className="dasbor-skel--judul" />
                      <Kerangka className="dasbor-skel--garis dasbor-skel--pendek" />
                      <Kerangka className="dasbor-skel--kecil" />
                      <Kerangka className="dasbor-skel--tombol" />
                    </div>
                  </div>
                ))}
              </div>
            ) : produk.length === 0 ? (
              <div className="dasbor-kosong dasbor-kosong--besar">
                <FiShoppingBag aria-hidden="true" />
                <strong>Belum ada produk</strong>
                <p>
                  Tambahkan produk pertamamu supaya pembeli bisa mulai memesan.
                </p>
                <Link
                  className="dasbor__tambah-produk"
                  href="/kelolatoko/produk/tambah"
                >
                  <FiPlus aria-hidden="true" />
                  Tambah produk
                </Link>
              </div>
            ) : produkTersaring.length === 0 ? (
              <p className="dasbor-kosong">
                Tidak ada produk yang cocok dengan “{cari}”.
              </p>
            ) : (
              <div className="dasbor-produk-grid">
                {produkTersaring.map((item) => {
                  const terjual = terjualMap.get(String(item.id)) ?? 0;
                  const gambar = gambarProduk(item);

                  return (
                    <article className="dasbor-produk" key={item.id}>
                      <Link
                        className={
                          "dasbor-produk__foto" +
                          (gambar ? "" : " dasbor-produk__foto--kosong")
                        }
                        href={`/kelolatoko/produk/${item.id}`}
                        aria-label={`Lihat pesanan ${item.nama}`}
                      >
                        {gambar ? (
                          <img src={gambar} alt={item.nama} loading="lazy" />
                        ) : (
                          <FiShoppingBag aria-hidden="true" />
                        )}
                        {terjual > 0 && (
                          <span className="dasbor-produk__terjual">
                            {angka(terjual)} terjual
                          </span>
                        )}
                      </Link>

                      <div className="dasbor-produk__isi">
                        <h4 title={item.nama}>{item.nama}</h4>
                        <p className="dasbor-produk__harga">
                          {formatHarga(item.harga)}
                        </p>
                        <p className="dasbor-produk__stok">
                          Stok {angka(item.stok)}
                        </p>

                        <div className="dasbor-produk__aksi">
                          <Link
                            className="dasbor-produk__tombol"
                            href={`/kelolatoko/produk/${item.id}`}
                          >
                            Pesanan
                          </Link>
                          <Link
                            className="dasbor-produk__tombol dasbor-produk__ikon"
                            href={`/kelolatoko/produk/edit/${item.id}`}
                            aria-label={`Edit ${item.nama}`}
                          >
                            <FiEdit aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            className="dasbor-produk__tombol dasbor-produk__ikon dasbor-produk__ikon--hapus"
                            onClick={() => setHapusId(item.id)}
                            aria-label={`Hapus ${item.nama}`}
                          >
                            <FiTrash2 aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <Link
        href="/kelolatoko/produk/tambah"
        className="kelola-toko__tambah dasbor__fab"
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
