"use client";

import "./Beranda.css";
import { useEffect, useState } from "react";

//context
import { useGlobalContext } from "@/Context/GlobalContext";

// components
import HeaderToko from "@/app/Components/HeaderToko/HeaderToko";
import FilterBar from "@/app/Components/FilterBar/FilterBar";
import KartuProduk from "@/app/Components/KartuProduk/KartuProduk";

const URL_PRODUK = "https://6ab5239024ee9d3caa1c3b25.mockapi.io/marketday";

function Beranda() {
  const { filterBeranda } = useGlobalContext();

  const [daftarProduk, setDaftarProduk] = useState([]);
  const [status, setStatus] = useState("memuat"); // "memuat" | "sukses" | "gagal"

  useEffect(() => {
    const pengendali = new AbortController();

    async function ambilProduk() {
      try {
        const respons = await fetch(URL_PRODUK, { signal: pengendali.signal });
        if (!respons.ok)
          throw new Error(`Gagal memuat produk (${respons.status})`);

        setDaftarProduk(await respons.json());
        setStatus("sukses");
      } catch (error) {
        if (error.name === "AbortError") return; // komponen ditutup, abaikan
        console.error(error);
        setStatus("gagal");
      }
    }

    ambilProduk();
    return () => pengendali.abort();
  }, []);

  // "Semua" = tampilkan semua, selain itu cocokkan dengan array kategori produk
  const produkTampil =
    filterBeranda === "Semua"
      ? daftarProduk
      : daftarProduk.filter((produk) =>
          produk.kategori.includes(filterBeranda),
        );

  return (
    <section>
      <HeaderToko />
      <FilterBar />

      {status === "memuat" && (
        <p className="beranda__status">Memuat produk...</p>
      )}
      {status === "gagal" && (
        <p className="beranda__status">Produk gagal dimuat. Coba lagi nanti.</p>
      )}
      {status === "sukses" && produkTampil.length === 0 && (
        <p className="beranda__status">Belum ada produk di kategori ini.</p>
      )}

      {status === "sukses" && produkTampil.length > 0 && (
        <div className="list-produk-dijual">
          {produkTampil.map((produk) => (
            <KartuProduk
              key={produk.id}
              href={`/detailproduk/${produk.id}`}
              nama={produk.nama}
              harga={produk.harga}
              gambar={produk.image?.[0]}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default Beranda;
