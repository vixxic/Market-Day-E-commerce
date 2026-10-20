"use client";

import "./Beranda.css";

//context
import { useGlobalContext } from "@/context/GlobalContext";
import { useProdukContext } from "@/context/ProdukContext";
import { useAuthContext } from "@/context/AuthContext";

// components
import HeaderToko from "@/components/HeaderToko/HeaderToko";
import FilterBar from "@/components/FilterBar/FilterBar";
import KartuProduk from "@/components/KartuProduk/KartuProduk";

function Beranda() {
  const { filterBeranda } = useGlobalContext();
  const { daftarProduk, loading, error } = useProdukContext();
  const { daftarToko, errorToko } = useAuthContext();

  // "Semua" = tampilkan semua, selain itu cocokkan dengan array kategori produk
  const produkTampil =
    filterBeranda === "Semua"
      ? daftarProduk
      : daftarProduk.filter((produk) =>
          (produk.kategori ?? []).includes(filterBeranda),
        );

  return (
    <section>
      <HeaderToko />
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
        <p className="beranda__status">Belum ada produk di kategori ini.</p>
      )}

      {!loading && !error && produkTampil.length > 0 && (
        <div className="list-produk-dijual">
          {produkTampil.map((produk) => (
            <KartuProduk
              key={produk.id}
              href={`/detailproduk/${produk.id}`}
              nama={produk.nama}
              harga={produk.harga}
              gambar={produk.image?.[0]}
              namaToko={
                daftarToko.find(
                  (toko) => String(toko.id) === String(produk.id_penjual),
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
