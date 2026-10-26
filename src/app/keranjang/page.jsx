"use client";

import "./Keranjang.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useKeranjangContext } from "@/Context/KeranjangContext";
import { usePesananContext } from "@/Context/PesananContext";
import { useProdukContext } from "@/Context/ProdukContext";

// components
import KartuKeranjang from "@/components/KartuKeranjang/KartuKeranjang";
import NavigasiBawah from "@/components/NavigasiBawah/NavigasiBawah";

export default function Keranjang() {
  const router = useRouter();
  const {
    keranjang,
    siap,
    error,
    hapusDariKeranjang,
    ubahJumlah,
  } = useKeranjangContext();
  const { daftarProduk } = useProdukContext();
  const { siapkanPemesanan } = usePesananContext();

  function hapus(idProduk) {
    hapusDariKeranjang(idProduk);
  }

  // Pesan satu produk (semua variannya) lalu pindah ke halaman pemesanan.
  function pesan(item) {
    const produk = daftarProduk.find(
      (baris) => String(baris.id) === String(item.idProduk),
    );
    const baris = item.varian.map((v) => ({
      idProduk: item.idProduk,
      id_toko: item.id_toko ?? produk?.id_toko,
      nama: item.nama,
      harga: item.harga,
      gambar: item.gambar,
      jenis: v.jenis,
      ukuran: v.ukuran,
      jumlah: v.jumlah,
    }));
    siapkanPemesanan(baris, { dariKeranjang: true });
    router.push("/pemesanan");
  }

  return (
    <div className="keranjang">
      <header className="keranjang__header">
        <h1 className="keranjang__judul">Keranjang</h1>
      </header>

      <main className="keranjang__isi">
        {error && (
          <p className="keranjang__galat" role="alert">
            Gagal memperbarui keranjang: {error}
          </p>
        )}
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
                  onUbahJumlah={(varian, jumlah) =>
                    ubahJumlah(item.idProduk, varian, jumlah)
                  }
                  onPesan={() => pesan(item)}
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
