"use client";

import "./Beranda.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FiArrowRight,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiShoppingBag,
  FiX,
} from "react-icons/fi";

// context
import { useGlobalContext } from "@/Context/GlobalContext";
import { useProdukContext } from "@/Context/ProdukContext";
import { useAuthContext } from "@/Context/AuthContext";

// components
import HeaderToko from "@/components/HeaderToko/HeaderToko";
import FilterBar from "@/components/FilterBar/FilterBar";
import KartuProduk from "@/components/KartuProduk/KartuProduk";

// utils
import { KATEGORI_PRODUK } from "@/lib/kategoriProduk";
import Image from "next/image";

const OPSI_URUTAN = [
  { id: "terbaru", label: "Terbaru" },
  { id: "termurah", label: "Harga terendah" },
  { id: "termahal", label: "Harga tertinggi" },
  { id: "nama", label: "Nama A–Z" },
];

function daftarKategori(produk) {
  if (Array.isArray(produk.kategori)) return produk.kategori;
  if (typeof produk.kategori === "string") {
    return produk.kategori.split(",").map((item) => item.trim());
  }
  return [];
}

function inisial(nama) {
  return String(nama ?? "Toko")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join("")
    .toUpperCase();
}

function waktuProduk(produk) {
  const waktu = Date.parse(produk.created_at ?? "");
  return Number.isFinite(waktu) ? waktu : 0;
}

function posisiHalamanToko(jalur) {
  const maksimal = jalur.scrollWidth - jalur.clientWidth;
  if (maksimal <= 0 || jalur.clientWidth === 0) return [0];

  const jumlahHalaman = Math.ceil(maksimal / jalur.clientWidth) + 1;
  return Array.from({ length: jumlahHalaman }, (_, indeks) =>
    Math.min(indeks * jalur.clientWidth, maksimal),
  );
}

function Beranda() {
  const {
    filterBeranda,
    kueriBeranda: kueriCari,
    setKueriBeranda,
  } = useGlobalContext();
  const { daftarProduk, loading, error } = useProdukContext();
  const { daftarToko, errorToko } = useAuthContext();
  const [pencarianTerbuka, setPencarianTerbuka] = useState(false);
  const [urutan, setUrutan] = useState("terbaru");
  const [jedaSliderToko, setJedaSliderToko] = useState(false);
  const [halamanAktifToko, setHalamanAktifToko] = useState(0);
  const [jumlahHalamanToko, setJumlahHalamanToko] = useState(1);
  const jalurTokoRef = useRef(null);

  function togglePencarian() {
    if (pencarianTerbuka) {
      setPencarianTerbuka(false);
      setKueriBeranda("");
      return;
    }
    setPencarianTerbuka(true);
  }

  const petaToko = useMemo(
    () => new Map(daftarToko.map((toko) => [String(toko.id), toko])),
    [daftarToko],
  );

  const kueriNormal = kueriCari.trim().toLocaleLowerCase();

  const hitunganKategori = useMemo(() => {
    const hasil = { All: daftarProduk.length };
    for (const kategori of KATEGORI_PRODUK) hasil[kategori] = 0;

    for (const produk of daftarProduk) {
      for (const kategori of daftarKategori(produk)) {
        const kunci = KATEGORI_PRODUK.find(
          (item) =>
            item.toLocaleLowerCase() === String(kategori).toLocaleLowerCase(),
        );
        if (kunci) hasil[kunci] += 1;
      }
    }

    return hasil;
  }, [daftarProduk]);

  const produkTampil = useMemo(() => {
    const hasil = daftarProduk
      .map((produk, indeks) => ({ produk, indeks }))
      .filter(({ produk }) => {
        const kategoriProduk = daftarKategori(produk);
        const cocokKategori =
          filterBeranda === "All" ||
          filterBeranda === "Semua" ||
          kategoriProduk.some(
            (kategori) =>
              String(kategori).trim().toLocaleLowerCase() ===
              filterBeranda.toLocaleLowerCase(),
          );

        const namaToko = petaToko.get(String(produk.id_toko))?.namaToko ?? "";
        const teksCari = [
          produk.nama,
          produk.deskripsi,
          namaToko,
          ...kategoriProduk,
          ...(Array.isArray(produk.rasa) ? produk.rasa : []),
          ...(Array.isArray(produk.ukuran) ? produk.ukuran : []),
        ]
          .filter((teks) => typeof teks === "string")
          .join(" ")
          .toLocaleLowerCase();

        return (
          cocokKategori && (!kueriNormal || teksCari.includes(kueriNormal))
        );
      });

    hasil.sort((a, b) => {
      if (urutan === "termurah") {
        return Number(a.produk.harga) - Number(b.produk.harga);
      }
      if (urutan === "termahal") {
        return Number(b.produk.harga) - Number(a.produk.harga);
      }
      if (urutan === "nama") {
        return String(a.produk.nama).localeCompare(String(b.produk.nama), "id");
      }

      const selisih = waktuProduk(b.produk) - waktuProduk(a.produk);
      return selisih !== 0 ? selisih : a.indeks - b.indeks;
    });

    return hasil.map(({ produk }) => produk);
  }, [daftarProduk, filterBeranda, kueriNormal, petaToko, urutan]);

  const tokoTampil = useMemo(
    () =>
      daftarToko
        .map((toko) => ({
          ...toko,
          jumlahProduk: daftarProduk.filter(
            (produk) => String(produk.id_toko) === String(toko.id),
          ).length,
        }))
        .sort((a, b) => b.jumlahProduk - a.jumlahProduk)
        .slice(0, 6),
    [daftarProduk, daftarToko],
  );

  useEffect(() => {
    const jalur = jalurTokoRef.current;
    if (!jalur) return undefined;

    function perbaruiHalaman() {
      const posisiHalaman = posisiHalamanToko(jalur);
      const halamanTerdekat = posisiHalaman.reduce(
        (terdekat, posisi, indeks) =>
          Math.abs(posisi - jalur.scrollLeft) <
          Math.abs(posisiHalaman[terdekat] - jalur.scrollLeft)
            ? indeks
            : terdekat,
        0,
      );
      setJumlahHalamanToko(posisiHalaman.length);
      setHalamanAktifToko(halamanTerdekat);
    }

    const pengamatUkuran = new ResizeObserver(perbaruiHalaman);
    pengamatUkuran.observe(jalur);
    perbaruiHalaman();
    return () => pengamatUkuran.disconnect();
  }, [tokoTampil.length]);

  const pilihHalamanToko = useCallback((indeks) => {
    const jalur = jalurTokoRef.current;
    if (!jalur) return;

    const posisiHalaman = posisiHalamanToko(jalur);
    const posisi = posisiHalaman[indeks];
    if (posisi === undefined) return;

    const kurangiGerak = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    jalur.scrollTo({
      left: posisi,
      behavior: kurangiGerak ? "auto" : "smooth",
    });
  }, []);

  const geserToko = useCallback(
    (arah) => {
      const jalur = jalurTokoRef.current;
      if (!jalur) return;

      const posisiHalaman = posisiHalamanToko(jalur);
      const halamanBerikutnya =
        (halamanAktifToko + arah + posisiHalaman.length) % posisiHalaman.length;
      pilihHalamanToko(halamanBerikutnya);
    },
    [halamanAktifToko, pilihHalamanToko],
  );

  useEffect(() => {
    if (jumlahHalamanToko < 2 || jedaSliderToko) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const timer = window.setInterval(() => geserToko(1), 4000);
    return () => window.clearInterval(timer);
  }, [geserToko, jedaSliderToko, jumlahHalamanToko]);

  const filterAktif = filterBeranda !== "All" && filterBeranda !== "Semua";
  const tampilkanToko = tokoTampil.length > 0;

  return (
    <section className="beranda">
      <HeaderToko
        pencarianTerbuka={pencarianTerbuka}
        nilaiCari={kueriCari}
        onCariKlik={togglePencarian}
        onCariUbah={setKueriBeranda}
      />

      <header className="beranda__hero" id="cara-pesan">
        <div className="beranda__hero-isi">
          <p className="beranda__eyebrow">Market Day · Sekolah</p>
          <h2 className="beranda__hero-judul">
            Dukung toko teman, temukan jajanan favorit.
          </h2>
          <p className="beranda__hero-teks">
            Belanja langsung dari toko siswa. Pilih produk, pesan, lalu ambil
            pesananmu di sekolah.
          </p>

          <div className="beranda__hero-statistik">
            <span>
              <strong>{daftarProduk.length}</strong> produk
            </span>
            <span>
              <strong>{daftarToko.length}</strong> toko
            </span>
            <span>
              <strong>{KATEGORI_PRODUK.length}</strong> kategori
            </span>
          </div>
        </div>
      </header>

      <section
        className="beranda__katalog"
        aria-labelledby="judul-katalog-beranda"
      >
        <div className="beranda__katalog-heading">
          <div>
            <p className="beranda__eyebrow beranda__eyebrow--gelap">
              Katalog Produk
            </p>
          </div>
        </div>

        <div className="urutkan_filterBar">
          <FilterBar hitungan={hitunganKategori} />
          <label className="beranda__urutan">
            <span>Urutkan</span>
            <select
              value={urutan}
              onChange={(event) => setUrutan(event.target.value)}
            >
              {OPSI_URUTAN.map((opsi) => (
                <option key={opsi.id} value={opsi.id}>
                  {opsi.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && <p className="beranda__status">Memuat produk...</p>}

        {error && (
          <p className="beranda__status beranda__status--galat" role="alert">
            Produk gagal dimuat: {error}
          </p>
        )}
        {errorToko && (
          <p className="beranda__status beranda__status--galat" role="alert">
            Informasi toko gagal dimuat: {errorToko}
          </p>
        )}

        {!loading && !error && produkTampil.length === 0 && (
          <div className="beranda__kosong">
            <span className="beranda__kosong-ikon" aria-hidden="true">
              <FiShoppingBag />
            </span>
            <h3>
              {kueriNormal
                ? "Produk tidak ditemukan"
                : "Belum ada produk di sini"}
            </h3>
            <p>
              {kueriNormal
                ? "Coba kata kunci lain atau jelajahi kategori yang tersedia."
                : "Produk baru akan muncul di katalog ini. Coba pilih kategori lain."}
            </p>
            {kueriNormal && (
              <button
                type="button"
                className="beranda__kosong-tombol"
                onClick={() => setKueriBeranda("")}
              >
                Hapus pencarian
              </button>
            )}
          </div>
        )}

        {!loading && !error && produkTampil.length > 0 && (
          <div className="list-produk-dijual">
            {produkTampil.map((produk) => {
              const toko = petaToko.get(String(produk.id_toko));
              return (
                <KartuProduk
                  key={produk.id}
                  href={`/detailproduk/${produk.id}`}
                  nama={produk.nama}
                  harga={produk.harga}
                  gambar={produk.gambar}
                  kategori={produk.kategori}
                  namaToko={toko?.namaToko}
                  fotoToko={toko?.fotoProfil}
                  hrefToko={toko ? `/toko/${toko.id}` : undefined}
                />
              );
            })}
          </div>
        )}
      </section>

      {tampilkanToko && (
        <section className="beranda__toko" aria-labelledby="judul-toko-beranda">
          <div className="beranda__bagian-heading">
            <div>
              <p className="beranda__eyebrow beranda__eyebrow--gelap">
                Jelajahi Toko Market Day
              </p>
            </div>
            <div className="beranda__toko-kontrol">
              <span className="beranda__hitung-toko">
                {daftarToko.length} toko aktif
              </span>
            </div>
          </div>

          <div
            ref={jalurTokoRef}
            className="beranda__toko-list"
            role="region"
            aria-label="Daftar toko Market Day"
            aria-roledescription="carousel"
            onScroll={(event) => {
              const posisiHalaman = posisiHalamanToko(event.currentTarget);
              const halamanTerdekat = posisiHalaman.reduce(
                (terdekat, posisi, indeks) =>
                  Math.abs(posisi - event.currentTarget.scrollLeft) <
                  Math.abs(
                    posisiHalaman[terdekat] - event.currentTarget.scrollLeft,
                  )
                    ? indeks
                    : terdekat,
                0,
              );
              setJumlahHalamanToko(posisiHalaman.length);
              setHalamanAktifToko(halamanTerdekat);
            }}
            onMouseEnter={() => setJedaSliderToko(true)}
            onMouseLeave={() => setJedaSliderToko(false)}
            onFocusCapture={() => setJedaSliderToko(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setJedaSliderToko(false);
              }
            }}
          >
            {tokoTampil.map((toko) => (
              <Link
                key={toko.id}
                className="beranda__toko-kartu"
                href={`/toko/${toko.id}`}
                aria-label={`Kunjungi toko ${toko.namaToko}, ${toko.jumlahProduk} produk`}
              >
                <span
                  className={`beranda__toko-banner${
                    toko.banner ? "" : " beranda__toko-banner--bawaan"
                  }`}
                >
                  <Image
                    src={toko.banner || "/banner-store-default.png"}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 264px"
                    loading="lazy"
                  />
                  <span className="beranda__toko-jumlah">
                    <FiShoppingBag aria-hidden="true" />
                    {toko.jumlahProduk} produk
                  </span>
                </span>

                <span className="beranda__toko-isi">
                  <span className="beranda__toko-avatar" aria-hidden="true">
                    {toko.fotoProfil ? (
                      <Image
                        src={toko.fotoProfil}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                      />
                    ) : (
                      inisial(toko.namaToko)
                    )}
                  </span>
                  <span className="beranda__toko-teks">
                    <strong>{toko.namaToko}</strong>
                    {toko.lokasi?.trim() && (
                      <span className="beranda__toko-lokasi">
                        <FiMapPin aria-hidden="true" />
                        {toko.lokasi.trim()}
                      </span>
                    )}
                  </span>
                </span>

                <span className="beranda__toko-deskripsi">
                  {toko.deskripsi?.trim() || "Jelajahi produk toko ini."}
                </span>

                <span className="beranda__toko-kaki">
                  Kunjungi toko
                  <FiArrowRight aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
          {jumlahHalamanToko > 1 && (
            <nav className="beranda__toko-pagination" aria-label="Halaman toko">
              {Array.from({ length: jumlahHalamanToko }, (_, indeks) => (
                <button
                  key={indeks}
                  type="button"
                  className={
                    "beranda__toko-pagination-titik" +
                    (indeks === halamanAktifToko
                      ? " beranda__toko-pagination-titik--aktif"
                      : "")
                  }
                  aria-label={`Tampilkan halaman toko ${indeks + 1}`}
                  aria-current={
                    indeks === halamanAktifToko ? "page" : undefined
                  }
                  onClick={() => pilihHalamanToko(indeks)}
                />
              ))}
            </nav>
          )}
        </section>
      )}
    </section>
  );
}

export default Beranda;
