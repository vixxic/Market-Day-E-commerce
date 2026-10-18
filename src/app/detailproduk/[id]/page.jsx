"use client";

import "./detailproduk.css";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// components
import GaleriProduk from "@/app/Components/GaleriProduk/GaleriProduk";
import PanelBeli from "@/app/Components/Panelbeli/Panelbeli";

// utils
import { formatHarga } from "@/app/formatHarga";
import { tambahKeKeranjang } from "@/app/keranjang";
import { siapkanPembayaran } from "@/app/pembayaran";

const URL_PRODUK = "https://6ab5239024ee9d3caa1c3b25.mockapi.io/marketday";

function IsiDetailProduk() {
  const { id } = useParams();
  const router = useRouter();

  const [produk, setProduk] = useState(null);
  const [status, setStatus] = useState("memuat"); // "memuat" | "sukses" | "tidakAda" | "gagal"
  const [panelTerbuka, setPanelTerbuka] = useState(false);

  useEffect(() => {
    const pengendali = new AbortController();
    setStatus("memuat");

    async function ambilProduk() {
      try {
        const respons = await fetch(`${URL_PRODUK}/${id}`, {
          signal: pengendali.signal,
        });
        if (respons.status === 404) {
          setStatus("tidakAda");
          return;
        }
        if (!respons.ok)
          throw new Error(`Gagal memuat produk (${respons.status})`);

        setProduk(await respons.json());
        setStatus("sukses");
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error(error);
        setStatus("gagal");
      }
    }

    ambilProduk();
    return () => pengendali.abort();
  }, [id]);

  function kembali() {
    // Kalau halaman dibuka langsung lewat link (tanpa riwayat), arahkan ke beranda
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  // Beli langsung (tanpa lewat keranjang)
  function tanganiBayar(pesanan) {
    siapkanPembayaran(pesanan, { dariKeranjang: false });
    setPanelTerbuka(false);
    router.push("/pembayaran");
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
            onBayar={tanganiBayar}
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
