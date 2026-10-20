"use client";

import "./pesanan.css";
import { useId, useState } from "react";
import Link from "next/link";
import { usePesananContext } from "@/Context/PesananContext";
import { useAuthContext } from "@/Context/AuthContext";

// components
import NavigasiBawah from "@/components/NavigasiBawah/NavigasiBawah";

// status pesanan -> teks & warna label
const STATUS = {
  menunggu_konfirmasi: { label: "Menunggu Konfirmasi", varian: "menunggu" },
  diproses: { label: "Diproses", varian: "menunggu" },
  selesai: { label: "Selesai", varian: "terverifikasi" },
  terverifikasi: { label: "Terverifikasi", varian: "terverifikasi" },
  ditolak: { label: "Ditolak", varian: "ditolak" },
  dibatalkan: { label: "Dibatalkan", varian: "ditolak" },
};

function KartuPesanan({ pesanan }) {
  const [terbuka, setTerbuka] = useState(false);
  const idRincian = useId();

  const status = STATUS[pesanan.status] ?? STATUS.menunggu_konfirmasi;

  const namaProduk = [...new Set(pesanan.item.map((b) => b.nama))];
  const judul =
    namaProduk.length > 1
      ? `${namaProduk[0]} +${namaProduk.length - 1} lainnya`
      : namaProduk[0];
  const gambar = pesanan.item.find((b) => b.gambar)?.gambar;

  return (
    <article className="kartu-pesanan">
      <div className="kartu-pesanan__ringkasan">
        <div className="kartu-pesanan__gambar">
          {gambar && (
            <img
              className="kartu-pesanan__foto"
              src={gambar}
              alt={judul}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>

        <div className="kartu-pesanan__info">
          <h2 className="kartu-pesanan__nama">{judul}</h2>
          <p className="kartu-pesanan__label-status">Status</p>
          <span
            className={`kartu-pesanan__status kartu-pesanan__status--${status.varian}`}
          >
            {status.label}
          </span>

          <button
            type="button"
            className={
              "kartu-pesanan__tombol" +
              (terbuka ? " kartu-pesanan__tombol--terbuka" : "")
            }
            aria-expanded={terbuka}
            aria-controls={idRincian}
            onClick={() => setTerbuka((sekarang) => !sekarang)}
          >
            Detail Pesanan
          </button>
        </div>
      </div>

      {/* Rincian: membuka / menutup dengan animasi tinggi */}
      <div
        id={idRincian}
        className={
          "kartu-pesanan__rincian" +
          (terbuka ? " kartu-pesanan__rincian--terbuka" : "")
        }
      >
        <div className="kartu-pesanan__rincian-isi">
          <div className="kartu-pesanan__varian-daftar">
            {pesanan.item.map((b, i) => (
              <div
                className="kartu-pesanan__varian"
                key={`${b.jenis}-${b.ukuran}-${i}`}
              >
                {namaProduk.length > 1 && <p>Produk: {b.nama}</p>}
                {b.jenis && <p>Jenis Produk: {b.jenis}</p>}
                <p>Ukuran: {b.ukuran}</p>
                <p>Jumlah: {b.jumlah}</p>
              </div>
            ))}
          </div>

          <div className="kartu-pesanan__kotak">
            <p>Nama Pemesan: {pesanan.namaPenerima || "-"}</p>
            <p>Nomor Pemesan: {pesanan.nomorPemesan || "-"}</p>
            <p>Id Pesanan: {pesanan.idPesanan ?? pesanan.id ?? "-"}</p>
            <p>
              Code klaim:{" "}
              <span className="kartu-pesanan__kode">
                {pesanan.kodeKlaim ?? "-"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Page() {
  const { daftarPesanan: daftar, loading, error } = usePesananContext();
  const { toko } = useAuthContext();
  const siap = !loading;

  return (
    <div className="pesanan">
      <header className="pesanan__header">
        <h1 className="pesanan__judul">Profil Pesananmu</h1>
      </header>

      <main className="pesanan__isi">
        {error && (
          <p className="pesanan__galat" role="alert">
            Gagal memproses pesanan: {error}
          </p>
        )}
        {loading && <p className="pesanan__status">Memuat pesanan...</p>}
        {siap && daftar.length === 0 && (
          <div className="pesanan__kosong">
            <p>Kamu belum punya pesanan.</p>
            <Link href="/" className="pesanan__tombol-belanja">
              Mulai belanja
            </Link>
          </div>
        )}

        {daftar.length > 0 && (
          <ul className="pesanan__daftar">
            {daftar.map((pesanan) => (
              <li key={pesanan.idPesanan}>
                <KartuPesanan pesanan={pesanan} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <NavigasiBawah halamanAktif="pesanan" />
    </div>
  );
}
