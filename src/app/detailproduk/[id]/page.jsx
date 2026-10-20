"use client";

import "./detailproduk.css";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// components
import GaleriProduk from "@/components/GaleriProduk/GaleriProduk";
import PanelBeli from "@/components/Panelbeli/Panelbeli";

// utils
import { formatHarga } from "@/lib/formatHarga";
import { useKeranjangContext } from "@/Context/KeranjangContext";
import { usePesananContext } from "@/Context/PesananContext";
import { useProdukContext } from "@/Context/ProdukContext";

function IsiDetailProduk() {
  const { id } = useParams();
  const router = useRouter();
  const { daftarProduk, ambilProdukById } = useProdukContext();
  const { tambahKeKeranjang, error: errorKeranjang } = useKeranjangContext();
  const { siapkanPemesanan } = usePesananContext();
  const [hasilDetail, setHasilDetail] = useState(null);
  const [panelTerbuka, setPanelTerbuka] = useState(false);

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
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M20 12H4M10.5 5.5 4 12l6.5 6.5" />
            </svg>
          </button>
          <h1 className="detail-produk__judul-halaman">Detail Produk</h1>
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
        <div className="detail-produk__status">
          <p>
            {status === "tidakAda"
              ? "Produk tidak ditemukan."
              : "Produk gagal dimuat. Coba lagi nanti."}
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
            <div className="detail-produk__galeri">
              <GaleriProduk
                key={produk.id}
                gambar={produk.image ?? []}
                nama={produk.nama}
              />
            </div>

            <div className="detail-produk__info">
              <h2 className="detail-produk__nama">{produk.nama}</h2>
              <p className="detail-produk__harga">
                {formatHarga(produk.harga)}
              </p>
              <p className="detail-produk__deskripsi">{produk.deskripsi}</p>

              <div className="detail-produk__aksi">
                <button
                  type="button"
                  className="detail-produk__tombol-beli"
                  onClick={() => setPanelTerbuka(true)}
                >
                  Beli
                </button>
              </div>
            </div>
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
