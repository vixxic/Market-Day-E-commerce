"use client";

import "./Beranda.css";
import { useState } from "react";

//context
import { useGlobalContext } from "@/Context/GlobalContext";
import { useProdukContext } from "@/Context/ProdukContext";
import { useAuthContext } from "@/Context/AuthContext";

// components
import HeaderToko from "@/components/HeaderToko/HeaderToko";
import FilterBar from "@/components/FilterBar/FilterBar";
import KartuProduk from "@/components/KartuProduk/KartuProduk";

function Beranda() {
  const { filterBeranda } = useGlobalContext();
  const { daftarProduk, loading, error } = useProdukContext();
  const { daftarToko, errorToko } = useAuthContext();
  const [pencarianTerbuka, setPencarianTerbuka] = useState(false);
  const [kueriCari, setKueriCari] = useState("");

  function togglePencarian() {
    if (pencarianTerbuka) {
      setPencarianTerbuka(false);
      setKueriCari("");
      return;
    }
    setPencarianTerbuka(true);
  }

  const kueriNormal = kueriCari.trim().toLocaleLowerCase();
  const produkTampil = daftarProduk.filter((produk) => {
    const cocokKategori =
      filterBeranda === "All" ||
      filterBeranda === "Semua" ||
      (Array.isArray(produk.kategori)
        ? produk.kategori
        : typeof produk.kategori === "string"
          ? produk.kategori.split(",")
          : []
      ).some(
        (kategori) =>
          typeof kategori === "string" &&
          kategori.trim().toLocaleLowerCase() ===
            filterBeranda.toLocaleLowerCase(),
      );

    const namaToko =
      daftarToko.find(
        (toko) => String(toko.id) === String(produk.id_toko),
      )?.namaToko ?? "";
    const teksCari = [
      produk.nama,
      produk.deskripsi,
      namaToko,
      ...(Array.isArray(produk.kategori)
        ? produk.kategori
        : typeof produk.kategori === "string"
          ? produk.kategori.split(",")
          : []),
      ...(Array.isArray(produk.rasa) ? produk.rasa : []),
      ...(Array.isArray(produk.ukuran) ? produk.ukuran : []),
    ]
      .filter((teks) => typeof teks === "string")
      .join(" ")
      .toLocaleLowerCase();

    return cocokKategori && (!kueriNormal || teksCari.includes(kueriNormal));
  });

  return (
    <section>
      <HeaderToko
        pencarianTerbuka={pencarianTerbuka}
        nilaiCari={kueriCari}
        onCariKlik={togglePencarian}
        onCariUbah={setKueriCari}
      />
      <FilterBar />

      {loading && <p className="beranda__status">Memuat produk...</p>}
      {error && (
        <p className="beranda__status">Produk gagal dimuat: {error}</p>
      )}
      {errorToko && (
        <p className="beranda__status" role="alert">
          Informasi toko gagal dimuat: {errorToko}
        </p>
      )}
      {!loading && !error && produkTampil.length === 0 && (
        <p className="beranda__status">
          {kueriNormal
            ? "Produk tidak ditemukan. Coba kata kunci lain."
            : "Belum ada produk di kategori ini."}
        </p>
      )}

      {!loading && !error && produkTampil.length > 0 && (
        <div className="list-produk-dijual">
          {produkTampil.map((produk) => (
            <KartuProduk
              key={produk.id}
              href={`/detailproduk/${produk.id}`}
              nama={produk.nama}
              harga={produk.harga}
              gambar={produk.gambar}
              namaToko={
                daftarToko.find(
                  (toko) => String(toko.id) === String(produk.id_toko),
                )?.namaToko
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default Beranda;
