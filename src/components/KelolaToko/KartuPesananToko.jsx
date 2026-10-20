"use client";

import { useState } from "react";
import {
  formatStatusPesanan,
  gambarProduk,
} from "@/lib/kelolaTokoClient";
import { formatHarga } from "@/lib/formatHarga";

export default function KartuPesananToko({
  pesanan,
  itemTampil = pesanan.item ?? [],
  onTerima,
  sedangMenerima,
}) {
  const [terbuka, setTerbuka] = useState(false);
  const itemUtama = itemTampil[0] ?? {};

  return (
    <article className="kelola-toko__order">
      <div className="kelola-toko__order-header">
        <img
          className="kelola-toko__order-img"
          src={gambarProduk(itemUtama)}
          alt={itemUtama.nama ?? "Produk pesanan"}
        />
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
          <p>Nomor Pemesan: {pesanan.nomorPemesan || "-"}</p>
          <p>ID Pesanan: {pesanan.idPesanan || pesanan.id || "-"}</p>
          <p>Status: {formatStatusPesanan(pesanan.status)}</p>
        </div>
      )}
    </article>
  );
}
