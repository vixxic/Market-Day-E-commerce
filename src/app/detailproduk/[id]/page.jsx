"use client";

import "./detailproduk.css";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiChevronRight,
  FiMapPin,
  FiShare2,
  FiShoppingBag,
  FiTag,
} from "react-icons/fi";

// components
import GaleriProduk from "@/components/GaleriProduk/GaleriProduk";
import PanelBeli from "@/components/Panelbeli/Panelbeli";
import KartuProduk from "@/components/KartuProduk/KartuProduk";

// utils
import { formatHarga } from "@/lib/formatHarga";
import { useAuthContext } from "@/Context/AuthContext";
import { useKeranjangContext } from "@/Context/KeranjangContext";
import { usePesananContext } from "@/Context/PesananContext";
import { useProdukContext } from "@/Context/ProdukContext";

const kunjunganDicatat = new Set();

function normalisasiPilihan(nilai) {
  if (Array.isArray(nilai)) {
    return nilai.filter((item) => typeof item === "string" && item.trim());
  }
  if (typeof nilai === "string") {
    return nilai
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function daftarKategori(produk) {
  return normalisasiPilihan(produk.kategori);
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

function IsiDetailProduk() {
  const { id } = useParams();
  const router = useRouter();
  const { daftarProduk, ambilProdukById } = useProdukContext();
  const { daftarToko } = useAuthContext();
  const { tambahKeKeranjang, error: errorKeranjang } = useKeranjangContext();
  const { siapkanPemesanan } = usePesananContext();
  const [hasilDetail, setHasilDetail] = useState(null);
  const [panelTerbuka, setPanelTerbuka] = useState(false);
  const [pesanBagikan, setPesanBagikan] = useState("");

  useEffect(() => {
    const pengendali = new AbortController();
    const sudahAda = daftarProduk.some(
      (item) => String(item.id) === String(id),
    );
    if (sudahAda) return () => pengendali.abort();

    ambilProdukById(id, { signal: pengendali.signal })
      .then((produk) =>
        setHasilDetail({
          id: String(id),
          produk,
          status: produk ? "sukses" : "tidakAda",
        }),
      )
      .catch((galat) => {
        if (galat.name === "AbortError") return;
        console.error(galat);
        setHasilDetail({ id: String(id), produk: null, status: "gagal" });
      });

    return () => pengendali.abort();
  }, [id, daftarProduk, ambilProdukById]);

  const produk =
    daftarProduk.find((item) => String(item.id) === String(id)) ??
    (hasilDetail?.id === String(id) ? hasilDetail.produk : null);
  const status = produk
    ? "sukses"
    : hasilDetail?.id === String(id)
      ? hasilDetail.status
      : "memuat";

  const toko = useMemo(
    () =>
      produk
        ? daftarToko.find(
            (item) => String(item.id) === String(produk.id_toko),
          ) ?? null
        : null,
    [daftarToko, produk],
  );

  const kategori = useMemo(
    () => (produk ? daftarKategori(produk) : []),
    [produk],
  );
  const daftarRasa = useMemo(
    () => (produk ? normalisasiPilihan(produk.rasa) : []),
    [produk],
  );
  const daftarUkuran = useMemo(
    () => (produk ? normalisasiPilihan(produk.ukuran) : []),
    [produk],
  );

  const produkTerkait = useMemo(() => {
    if (!produk) return [];

    const dariToko = daftarProduk.filter(
      (item) =>
        String(item.id) !== String(produk.id) &&
        String(item.id_toko) === String(produk.id_toko),
    );
    const kategoriProduk = daftarKategori(produk).map((item) =>
      item.toLocaleLowerCase(),
    );
    const serupa = daftarProduk.filter(
      (item) =>
        String(item.id) !== String(produk.id) &&
        String(item.id_toko) !== String(produk.id_toko) &&
        daftarKategori(item).some((kategoriItem) =>
          kategoriProduk.includes(kategoriItem.toLocaleLowerCase()),
        ),
    );

    const unik = new Map();
    for (const item of [...dariToko, ...serupa]) {
      unik.set(String(item.id), item);
    }
    return [...unik.values()].slice(0, 4);
  }, [daftarProduk, produk]);

  // Catat kunjungan sekali per sesi per produk untuk analitik toko.
  useEffect(() => {
    if (!produk?.id) return undefined;

    const kunci = `marketday-dilihat:${produk.id}`;
    if (kunjunganDicatat.has(kunci)) return undefined;

    try {
      if (window.sessionStorage.getItem(kunci)) return undefined;
    } catch {
      // sessionStorage bisa diblokir; tetap catat sekali per muat halaman.
    }

    kunjunganDicatat.add(kunci);

    // Jangan dibatalkan saat effect dibersihkan (StrictMode di dev memanggil
    // effect dua kali dan sempat membatalkan permintaan sebelum terkirim).
    fetch(`/api/produk/${encodeURIComponent(produk.id)}/kunjungan`, {
      method: "POST",
    })
      .then((respons) => {
        if (!respons.ok) {
          kunjunganDicatat.delete(kunci);
          return;
        }
        try {
          window.sessionStorage.setItem(kunci, "1");
        } catch {
          // abaikan
        }
      })
      .catch(() => {
        // Gagal mencatat: izinkan percobaan berikutnya.
        kunjunganDicatat.delete(kunci);
      });

    return undefined;
  }, [produk?.id]);

  function kembali() {
    // Kalau halaman dibuka langsung lewat link (tanpa riwayat), arahkan ke beranda
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  // Pesan langsung (tanpa lewat keranjang)
  function tanganiPesan(pesanan) {
    siapkanPemesanan(pesanan, { dariKeranjang: false });
    setPanelTerbuka(false);
    router.push("/pemesanan");
  }

  function tanganiMasukKeranjang(pesanan) {
    tambahKeKeranjang(pesanan);
    setPanelTerbuka(false);
    router.push("/keranjang");
  }

  async function bagikan() {
    if (!produk) return;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: produk.nama,
          text: `Lihat ${produk.nama} di Market Day`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setPesanBagikan("Tautan produk disalin.");
      window.setTimeout(() => setPesanBagikan(""), 2500);
    } catch (galat) {
      if (galat.name === "AbortError") return;
      setPesanBagikan("Gagal membagikan tautan.");
      window.setTimeout(() => setPesanBagikan(""), 2500);
    }
  }

  return (
    <div className="detail-produk">
      <header className="detail-produk__header">
        <div className="detail-produk__header-isi">
          <button
            type="button"
            className="detail-produk__kembali"
            aria-label="Kembali"
            onClick={kembali}
          >
            <FiArrowLeft aria-hidden="true" />
          </button>
          <h1 className="detail-produk__judul-halaman">Detail Produk</h1>
          <button
            type="button"
            className="detail-produk__bagikan-ikon"
            aria-label="Bagikan produk"
            onClick={bagikan}
            disabled={!produk}
          >
            <FiShare2 aria-hidden="true" />
          </button>
        </div>
      </header>

      {status === "memuat" && (
        <p className="detail-produk__status">Memuat produk...</p>
      )}

      {errorKeranjang && (
        <p className="detail-produk__status" role="alert">
          Keranjang gagal diperbarui: {errorKeranjang}
        </p>
      )}

      {(status === "tidakAda" || status === "gagal") && (
        <div className="detail-produk__status detail-produk__status--kotak">
          <h2>
            {status === "tidakAda"
              ? "Produk tidak ditemukan"
              : "Produk gagal dimuat"}
          </h2>
          <p>
            {status === "tidakAda"
              ? "Produk mungkin sudah dihapus atau tautannya berubah."
              : "Coba lagi beberapa saat lagi."}
          </p>
          <button
            type="button"
            className="detail-produk__tombol-kembali"
            onClick={() => router.push("/")}
          >
            Kembali ke beranda
          </button>
        </div>
      )}

      {status === "sukses" && produk && (
        <>
          <main className="detail-produk__isi">
            <nav className="detail-produk__remah" aria-label="Breadcrumb">
              <Link href="/">Beranda</Link>
              <FiChevronRight aria-hidden="true" />
              {toko && (
                <>
                  <Link href={`/toko/${toko.id}`}>{toko.namaToko}</Link>
                  <FiChevronRight aria-hidden="true" />
                </>
              )}
              <span aria-current="page">{produk.nama}</span>
            </nav>

            <div className="detail-produk__grid">
              <div className="detail-produk__galeri">
                <GaleriProduk
                  key={produk.id}
                  gambar={produk.image ?? []}
                  nama={produk.nama}
                  otomatis={false}
                />
              </div>

              <div className="detail-produk__info">
                {kategori.length > 0 && (
                  <div className="detail-produk__kategori">
                    {kategori.map((item) => (
                      <span key={item}>
                        <FiTag aria-hidden="true" /> {item}
                      </span>
                    ))}
                  </div>
                )}

                <h2 className="detail-produk__nama">{produk.nama}</h2>
                <p className="detail-produk__harga">
                  {formatHarga(produk.harga)}
                </p>

                {toko && (
                  <Link
                    className="detail-produk__toko"
                    href={`/toko/${toko.id}`}
                  >
                    <span className="detail-produk__toko-avatar">
                      {toko.fotoProfil ? (
                        <img src={toko.fotoProfil} alt="" />
                      ) : (
                        inisial(toko.namaToko)
                      )}
                    </span>
                    <span className="detail-produk__toko-teks">
                      <span>Penjual</span>
                      <strong>{toko.namaToko}</strong>
                      <small>
                        {toko.lokasi || "Lihat semua produk toko ini"}
                      </small>
                    </span>
                    <FiChevronRight aria-hidden="true" />
                  </Link>
                )}

                <section className="detail-produk__deskripsi">
                  <h3 className="detail-produk__judul-deskripsi">
                    Deskripsi Produk
                  </h3>
                  <p>
                    {produk.deskripsi?.trim() ||
                      "Deskripsi produk belum tersedia."}
                  </p>
                </section>

                {(daftarRasa.length > 0 || daftarUkuran.length > 0) && (
                  <section className="detail-produk__varian">
                    <h3 className="detail-produk__judul-deskripsi">
                      Pilihan tersedia
                    </h3>
                    {daftarRasa.length > 0 && (
                      <div className="detail-produk__varian-baris">
                        <span>Jenis</span>
                        <div>
                          {daftarRasa.map((item) => (
                            <span
                              className="detail-produk__varian-chip"
                              key={`rasa-${item}`}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {daftarUkuran.length > 0 && (
                      <div className="detail-produk__varian-baris">
                        <span>Ukuran</span>
                        <div>
                          {daftarUkuran.map((item) => (
                            <span
                              className="detail-produk__varian-chip"
                              key={`ukuran-${item}`}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                <ul className="detail-produk__jaminan">
                  <li>
                    <FiShoppingBag aria-hidden="true" />
                    <span>
                      <strong>Pesan langsung</strong>
                      Pilih varian lalu masukkan ke keranjang.
                    </span>
                  </li>
                  <li>
                    <FiMapPin aria-hidden="true" />
                    <span>
                      <strong>Ambil di sekolah</strong>
                      Tunjukkan kode klaim saat mengambil pesanan.
                    </span>
                  </li>
                </ul>

                <div className="detail-produk__aksi">
                  <div className="detail-produk__aksi-harga">
                    <span>Harga</span>
                    <strong>{formatHarga(produk.harga)}</strong>
                  </div>
                  <button
                    type="button"
                    className="detail-produk__tombol-beli"
                    onClick={() => setPanelTerbuka(true)}
                  >
                    Beli sekarang
                  </button>
                </div>
              </div>
            </div>

            {produkTerkait.length > 0 && (
              <section
                className="detail-produk__terkait"
                aria-labelledby="judul-produk-terkait"
              >
                <div className="detail-produk__terkait-heading">
                  <div>
                    <p>Lanjut jelajah</p>
                    <h2 id="judul-produk-terkait">
                      {produkTerkait.some(
                        (item) =>
                          String(item.id_toko) === String(produk.id_toko),
                      )
                        ? "Produk lain dari toko ini"
                        : "Produk serupa"}
                    </h2>
                  </div>
                  {toko && (
                    <Link href={`/toko/${toko.id}`}>
                      Lihat toko <FiChevronRight aria-hidden="true" />
                    </Link>
                  )}
                </div>

                <div className="detail-produk__terkait-grid">
                  {produkTerkait.map((item) => {
                    const tokoItem = daftarToko.find(
                      (tokoData) =>
                        String(tokoData.id) === String(item.id_toko),
                    );
                    return (
                      <KartuProduk
                        key={item.id}
                        href={`/detailproduk/${item.id}`}
                        nama={item.nama}
                        harga={item.harga}
                        gambar={item.gambar}
                        kategori={item.kategori}
                        namaToko={tokoItem?.namaToko}
                        fotoToko={tokoItem?.fotoProfil}
                        hrefToko={
                          tokoItem ? `/toko/${tokoItem.id}` : undefined
                        }
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </main>

          <PanelBeli
            key={produk.id}
            terbuka={panelTerbuka}
            onTutup={() => setPanelTerbuka(false)}
            produk={produk}
            onPesan={tanganiPesan}
            onMasukKeranjang={tanganiMasukKeranjang}
          />
        </>
      )}

      {pesanBagikan && (
        <p className="detail-produk__toast" role="status">
          {pesanBagikan}
        </p>
      )}
    </div>
  );
}

// useParams() harus berada di dalam <Suspense> (aturan Next.js terbaru)
export default function DetailProduk() {
  return (
    <Suspense
      fallback={<p className="detail-produk__status">Memuat produk...</p>}
    >
      <IsiDetailProduk />
    </Suspense>
  );
}
