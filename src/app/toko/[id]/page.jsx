"use client";

import "./toko.css";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiCalendar,
  FiEdit2,
  FiMapPin,
  FiMessageCircle,
  FiPackage,
  FiSearch,
  FiShare2,
  FiX,
} from "react-icons/fi";

import KartuProduk from "@/components/KartuProduk/KartuProduk";
import NavigasiBawah from "@/components/NavigasiBawah/NavigasiBawah";
import { useAuthContext } from "@/Context/AuthContext";
import { useProdukContext } from "@/Context/ProdukContext";
import { ambilTokoById } from "@/lib/api/tokoApi";
import { KATEGORI_PRODUK } from "@/lib/kategoriProduk";

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

function nomorWhatsApp(nomor) {
  const angka = String(nomor ?? "").replace(/\D/g, "");
  if (!angka) return null;
  return angka.startsWith("0") ? `62${angka.slice(1)}` : angka;
}

function IsiHalamanToko() {
  const { id } = useParams();
  const router = useRouter();
  const { daftarProduk, loading: loadingProduk, error: errorProduk } =
    useProdukContext();
  const { toko: sesiToko } = useAuthContext();
  const [hasilToko, setHasilToko] = useState(null);
  const [kueri, setKueri] = useState("");
  const [kategoriAktif, setKategoriAktif] = useState("Semua");
  const [pesanBagikan, setPesanBagikan] = useState("");

  useEffect(() => {
    const pengendali = new AbortController();

    ambilTokoById(id, { signal: pengendali.signal })
      .then((data) => {
        setHasilToko({ id, status: "sukses", data, error: "" });
      })
      .catch((galat) => {
        if (galat.name === "AbortError") return;
        setHasilToko({
          id,
          status: galat.status === 404 ? "tidakAda" : "gagal",
          data: null,
          error: galat.message,
        });
      });

    return () => pengendali.abort();
  }, [id]);

  const toko = hasilToko?.id === id ? hasilToko.data : null;
  const status = hasilToko?.id === id ? hasilToko.status : "memuat";
  const error = hasilToko?.id === id ? hasilToko.error : "";
  const pemilik = Boolean(sesiToko && String(sesiToko.id) === String(id));

  const produkToko = useMemo(
    () =>
      daftarProduk.filter(
        (produk) => String(produk.id_toko) === String(id),
      ),
    [daftarProduk, id],
  );

  const kategoriTersedia = useMemo(() => {
    const ditemukan = new Set();
    for (const produk of produkToko) {
      for (const kategori of daftarKategori(produk)) {
        if (kategori) ditemukan.add(kategori);
      }
    }

    const urut = KATEGORI_PRODUK.filter((kategori) =>
      [...ditemukan].some(
        (item) =>
          item.toLocaleLowerCase() === kategori.toLocaleLowerCase(),
      ),
    );
    const tambahan = [...ditemukan].filter(
      (item) =>
        !KATEGORI_PRODUK.some(
          (kategori) =>
            kategori.toLocaleLowerCase() === item.toLocaleLowerCase(),
        ),
    );

    return [...new Set(["Semua", ...urut, ...tambahan])];
  }, [produkToko]);

  const kueriNormal = kueri.trim().toLocaleLowerCase();
  const produkTampil = useMemo(
    () =>
      produkToko.filter((produk) => {
        const kategoriCocok =
          kategoriAktif === "Semua" ||
          daftarKategori(produk).some(
            (kategori) =>
              String(kategori).toLocaleLowerCase() ===
              kategoriAktif.toLocaleLowerCase(),
          );

        const teks = [
          produk.nama,
          produk.deskripsi,
          ...daftarKategori(produk),
          ...(Array.isArray(produk.rasa) ? produk.rasa : []),
          ...(Array.isArray(produk.ukuran) ? produk.ukuran : []),
        ]
          .filter((item) => typeof item === "string")
          .join(" ")
          .toLocaleLowerCase();

        return kategoriCocok && (!kueriNormal || teks.includes(kueriNormal));
      }),
    [kategoriAktif, kueriNormal, produkToko],
  );

  function kembali() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  async function bagikan() {
    const url = window.location.href;
    const judul = toko ? `Toko ${toko.namaToko}` : "Toko Market Day";

    try {
      if (navigator.share) {
        await navigator.share({ title: judul, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setPesanBagikan("Tautan toko disalin.");
    } catch (galat) {
      if (galat.name === "AbortError") return;
      setPesanBagikan("Gagal membagikan tautan.");
    }
  }

  const nomorWa = toko ? nomorWhatsApp(toko.whatsappNumber) : null;
  const bergabung =
    toko?.createdAt &&
    new Date(toko.createdAt).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

  return (
    <div className="toko-publik">
      <header className="toko-publik__header">
        <div className="toko-publik__header-isi">
          <button
            type="button"
            className="toko-publik__ikon-tombol"
            aria-label="Kembali"
            onClick={kembali}
          >
            <FiArrowLeft aria-hidden="true" />
          </button>
          <span className="toko-publik__header-judul">Halaman Toko</span>
          <button
            type="button"
            className="toko-publik__ikon-tombol"
            aria-label="Bagikan halaman toko"
            onClick={bagikan}
          >
            <FiShare2 aria-hidden="true" />
          </button>
        </div>
      </header>

      {pesanBagikan && (
        <p className="toko-publik__pesan" role="status">
          {pesanBagikan}
        </p>
      )}

      {status === "memuat" && (
        <p className="toko-publik__status">Memuat toko...</p>
      )}

      {status === "tidakAda" && (
        <div className="toko-publik__status toko-publik__status--kotak">
          <h1>Toko tidak ditemukan</h1>
          <p>Toko mungkin sudah tidak aktif atau tautannya berubah.</p>
          <button type="button" onClick={() => router.push("/")}>
            Kembali ke beranda
          </button>
        </div>
      )}

      {status === "gagal" && (
        <div className="toko-publik__status toko-publik__status--kotak">
          <h1>Toko gagal dimuat</h1>
          <p>{error || "Coba lagi beberapa saat lagi."}</p>
          <button type="button" onClick={() => router.refresh()}>
            Coba lagi
          </button>
        </div>
      )}

      {status === "sukses" && toko && (
        <main className="toko-publik__isi">
          <section className="toko-publik__hero">
            <div
              className={
                "toko-publik__banner" +
                (toko.banner ? " toko-publik__banner--foto" : "")
              }
              style={
                toko.banner
                  ? { backgroundImage: `url("${toko.banner}")` }
                  : undefined
              }
              aria-hidden="true"
            />

            {pemilik && (
              <Link
                className="toko-publik__edit-banner"
                href="/kelolatoko/profil"
              >
                <FiEdit2 aria-hidden="true" /> Edit banner
              </Link>
            )}

            <div className="toko-publik__identitas">
              <div className="toko-publik__avatar">
                {toko.fotoProfil ? (
                  <img src={toko.fotoProfil} alt={toko.namaToko} />
                ) : (
                  <span aria-hidden="true">{inisial(toko.namaToko)}</span>
                )}
                {pemilik && (
                  <Link
                    className="toko-publik__edit-avatar"
                    href="/kelolatoko/profil"
                    aria-label="Edit foto profil toko"
                  >
                    <FiEdit2 aria-hidden="true" />
                  </Link>
                )}
              </div>

              <div className="toko-publik__info">
                <span className="toko-publik__badge">Toko aktif</span>
                <h1>{toko.namaToko}</h1>
                <p className="toko-publik__deskripsi">
                  {toko.deskripsi?.trim() ||
                    "Toko ini belum menambahkan deskripsi. Jelajahi produknya di bawah."}
                </p>

                <div className="toko-publik__meta">
                  {toko.lokasi && (
                    <span>
                      <FiMapPin aria-hidden="true" /> {toko.lokasi}
                    </span>
                  )}
                  <span>
                    <FiPackage aria-hidden="true" />{" "}
                    {produkToko.length || toko.jumlahProduk || 0} produk
                  </span>
                  {bergabung && (
                    <span>
                      <FiCalendar aria-hidden="true" /> Bergabung {bergabung}
                    </span>
                  )}
                </div>

                <div className="toko-publik__aksi">
                  {nomorWa && (
                    <a
                      className="toko-publik__tombol toko-publik__tombol--wa"
                      href={`https://wa.me/${nomorWa}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FiMessageCircle aria-hidden="true" /> Hubungi toko
                    </a>
                  )}
                  <button
                    type="button"
                    className="toko-publik__tombol toko-publik__tombol--sekunder"
                    onClick={bagikan}
                  >
                    <FiShare2 aria-hidden="true" /> Bagikan
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
            className="toko-publik__katalog"
            aria-labelledby="judul-produk-toko"
          >
            <div className="toko-publik__katalog-heading">
              <div>
                <p className="toko-publik__eyebrow">Katalog toko</p>
                <h2 id="judul-produk-toko">Produk {toko.namaToko}</h2>
              </div>
              <span>{produkTampil.length} produk</span>
            </div>

            <div className="toko-publik__kontrol">
              <div className="toko-publik__pencarian">
                <FiSearch aria-hidden="true" />
                <input
                  type="search"
                  value={kueri}
                  onChange={(event) => setKueri(event.target.value)}
                  placeholder="Cari produk di toko ini..."
                  aria-label={`Cari produk di ${toko.namaToko}`}
                />
                {kueri && (
                  <button
                    type="button"
                    aria-label="Hapus pencarian"
                    onClick={() => setKueri("")}
                  >
                    <FiX aria-hidden="true" />
                  </button>
                )}
              </div>

              {kategoriTersedia.length > 1 && (
                <div
                  className="toko-publik__kategori"
                  role="group"
                  aria-label="Filter kategori produk toko"
                >
                  {kategoriTersedia.map((kategori) => (
                    <button
                      key={kategori}
                      type="button"
                      className={
                        "toko-publik__kategori-pil" +
                        (kategori === kategoriAktif
                          ? " toko-publik__kategori-pil--aktif"
                          : "")
                      }
                      aria-pressed={kategori === kategoriAktif}
                      onClick={() => setKategoriAktif(kategori)}
                    >
                      {kategori}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {errorProduk && (
              <p className="toko-publik__status" role="alert">
                Produk gagal dimuat: {errorProduk}
              </p>
            )}

            {loadingProduk && (
              <p className="toko-publik__status">Memuat produk...</p>
            )}

            {!loadingProduk && !errorProduk && produkTampil.length === 0 && (
              <div className="toko-publik__kosong">
                <span aria-hidden="true">
                  <FiPackage />
                </span>
                <h3>
                  {kueriNormal || kategoriAktif !== "Semua"
                    ? "Produk tidak ditemukan"
                    : "Belum ada produk"}
                </h3>
                <p>
                  {kueriNormal || kategoriAktif !== "Semua"
                    ? "Coba kata kunci atau kategori lain."
                    : "Toko ini belum menambahkan produk."}
                </p>
              </div>
            )}

            {!loadingProduk && !errorProduk && produkTampil.length > 0 && (
              <div className="toko-publik__grid">
                {produkTampil.map((produk) => (
                  <KartuProduk
                    key={produk.id}
                    href={`/detailproduk/${produk.id}`}
                    nama={produk.nama}
                    harga={produk.harga}
                    gambar={produk.gambar}
                    kategori={produk.kategori}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      <NavigasiBawah halamanAktif="beranda" />
    </div>
  );
}

export default function HalamanToko() {
  return (
    <Suspense fallback={<p className="toko-publik__status">Memuat toko...</p>}>
      <IsiHalamanToko />
    </Suspense>
  );
}
