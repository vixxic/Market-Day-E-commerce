"use client";

import { useState } from "react";
import { FiShoppingBag } from "react-icons/fi";
import {
  formatStatusPesanan,
  gambarProduk,
} from "@/lib/kelolaTokoClient";
import { formatHarga } from "@/lib/formatHarga";
import { formatTanggal } from "@/lib/tanggal";
import PopupKonfirmasi from "@/components/PopupKonfirmasi/PopupKonfirmasi";

export default function KartuPesananToko({
  pesanan,
  itemTampil = pesanan.item ?? [],
  gambarFallback,
  onTerima,
  onTolak,
  onBatalkan,
  onSelesaikan,
  sedangMenerima,
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [aksiKonfirmasi, setAksiKonfirmasi] = useState(null);
  const itemUtama = itemTampil[0] ?? {};
  const gambar = gambarProduk({
    ...itemUtama,
    gambar: itemUtama.gambar ?? gambarFallback,
  });

  const konfirmasi = {
    tolak: {
      judul: "Tolak pesanan?",
      pesan: "Status pesanan akan berubah menjadi Ditolak dan dapat dilihat pelanggan.",
      teksKonfirmasi: "Ya, tolak",
      penangan: onTolak,
    },
    batalkan: {
      judul: "Batalkan pesanan?",
      pesan: "Status pesanan akan berubah menjadi Dibatalkan dan dapat dilihat pelanggan.",
      teksKonfirmasi: "Ya, batalkan",
      penangan: onBatalkan,
    },
    selesai: {
      judul: "Tandai pesanan selesai?",
      pesan: "Pesanan akan dipindahkan ke riwayat toko dan tetap dihitung di analitik.",
      teksKonfirmasi: "Ya, selesaikan",
      penangan: onSelesaikan,
    },
  }[aksiKonfirmasi];

  async function jalankanAksiKonfirmasi() {
    if (!konfirmasi?.penangan) return;
    const berhasil = await konfirmasi.penangan(pesanan);
    if (berhasil) setAksiKonfirmasi(null);
  }

  return (
    <article className="kelola-toko__order">
      <div className="kelola-toko__order-header">
        {gambar ? (
          <img
            className="kelola-toko__order-img"
            src={gambar}
            alt={itemUtama.nama ?? "Produk pesanan"}
          />
        ) : (
          <span
            className="kelola-toko__order-img kelola-toko__order-img--kosong"
            aria-hidden="true"
          >
            <FiShoppingBag />
          </span>
        )}
        <div className="kelola-toko__order-info">
          <h2>{itemTampil.length > 1 ? `${itemUtama.nama} +${itemTampil.length - 1} produk` : itemUtama.nama}</h2>
          <p>{formatHarga(itemTampil.reduce((total, item) => total + Number(item.subtotal ?? Number(item.harga) * Number(item.jumlah)), 0))}</p>
          <button
            type="button"
            className="kelola-toko__tombol"
            aria-expanded={terbuka}
            onClick={() => setTerbuka((nilai) => !nilai)}
          >
            {terbuka ? "Tutup detail" : "Detail pesanan"}
          </button>
        </div>
        {(onTerima || onTolak || onBatalkan || onSelesaikan) && (
          <div className="kelola-toko__order-aksi">
            {onTerima && (
              <button
                type="button"
                className="kelola-toko__terima"
                disabled={sedangMenerima}
                onClick={() => onTerima(pesanan)}
              >
                {sedangMenerima ? "Menyimpan..." : "Terima"}
              </button>
            )}
            {onTolak && (
              <button
                type="button"
                className="kelola-toko__terima kelola-toko__terima--sekunder"
                disabled={sedangMenerima}
                onClick={() => setAksiKonfirmasi("tolak")}
              >
                Tolak
              </button>
            )}
            {onBatalkan && (
              <button
                type="button"
                className="kelola-toko__terima kelola-toko__terima--sekunder"
                disabled={sedangMenerima}
                onClick={() => setAksiKonfirmasi("batalkan")}
              >
                Batalkan
              </button>
            )}
            {onSelesaikan && (
              <button
                type="button"
                className="kelola-toko__terima kelola-toko__selesaikan"
                disabled={sedangMenerima}
                onClick={() => setAksiKonfirmasi("selesai")}
              >
                {sedangMenerima ? "Menyimpan..." : "Selesai"}
              </button>
            )}
          </div>
        )}
      </div>

      {terbuka && (
        <div className="kelola-toko__detail">
          {itemTampil.map((item, index) => (
            <div className="kelola-toko__detail-item" key={`${item.id_produk}-${index}`}>
              <strong>{item.nama}</strong>
              {item.varian?.rasa && <p>Jenis Produk: {item.varian.rasa}</p>}
              {item.varian?.ukuran && <p>Ukuran: {item.varian.ukuran}</p>}
              <p>Jumlah: {item.jumlah}</p>
              <p>Subtotal: {formatHarga(item.subtotal ?? item.harga * item.jumlah)}</p>
            </div>
          ))}
          <p>Nama Pemesan: {pesanan.namaPenerima || "-"}</p>
          <p>Nomor Pemesan: {<a href={`https://wa.me/${pesanan.nomorPemesan}`} target="_blank">
            {pesanan.nomorPemesan || "-"}
          </a>}</p>
          <p>ID Pesanan: {pesanan.idPesanan || pesanan.id || "-"}</p>
          <p>Kode Klaim: {pesanan.kodeKlaim || pesanan.kode_klaim || "-"}</p>
          <p>Status: {formatStatusPesanan(pesanan.status)}</p>
          {pesanan.status === "selesai" && (
            <p>
              Diselesaikan:{" "}
              {formatTanggal(pesanan.updated_at ?? pesanan.created_at, {
                denganHari: true,
              })}
            </p>
          )}
        </div>
      )}
      <PopupKonfirmasi
        buka={Boolean(konfirmasi)}
        judul={konfirmasi?.judul}
        pesan={konfirmasi?.pesan}
        teksKonfirmasi={konfirmasi?.teksKonfirmasi}
        memproses={sedangMenerima}
        onKonfirmasi={jalankanAksiKonfirmasi}
        onBatal={() => setAksiKonfirmasi(null)}
      />
    </article>
  );
}
