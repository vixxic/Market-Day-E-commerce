"use client";

import "./Keranjang.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// components
import KartuKeranjang from "@/app/Components/KartuKeranjang/KartuKeranjang";
import NavigasiBawah from "@/app/Components/NavigasiBawah/NavigasiBawah";

// utils
import { ambilKeranjang, hapusDariKeranjang } from "../keranjang";
import { siapkanPembayaran } from "../pembayaran";

export default function Keranjang() {
  const router = useRouter();
  const [keranjang, setKeranjang] = useState([]);
  const [siap, setSiap] = useState(false); // false sampai localStorage terbaca

  useEffect(() => {
    setKeranjang(ambilKeranjang());
    setSiap(true);
  }, []);

  function hapus(idProduk) {
    setKeranjang(hapusDariKeranjang(idProduk));
  }

  // Bayar satu produk (semua variannya) lalu pindah ke halaman pembayaran
  function bayar(item) {
    const baris = item.varian.map((v) => ({
      idProduk: item.idProduk,
      nama: item.nama,
      harga: item.harga,
      gambar: item.gambar,
      qris: item.qris,
      jenis: v.jenis,
      ukuran: v.ukuran,
      jumlah: v.jumlah,
    }));
    siapkanPembayaran(baris, { dariKeranjang: true });
    router.push("/pembayaran");
  }

  return (
    <div className="keranjang">
      <header className="keranjang__header">
        <h1 className="keranjang__judul">Keranjang</h1>
      </header>

      <main className="keranjang__isi">
        {siap && keranjang.length === 0 && (
          <div className="keranjang__kosong">
            <p>Keranjang masih kosong.</p>
            <Link href="/" className="keranjang__tombol-belanja">
              Mulai belanja
            </Link>
          </div>
        )}

        {keranjang.length > 0 && (
          <ul className="keranjang__daftar">
            {keranjang.map((item) => (
              <li key={item.idProduk}>
                <KartuKeranjang
                  item={item}
                  onHapus={() => hapus(item.idProduk)}
                  onBayar={() => bayar(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <NavigasiBawah halamanAktif="keranjang" />
    </div>
  );
}
