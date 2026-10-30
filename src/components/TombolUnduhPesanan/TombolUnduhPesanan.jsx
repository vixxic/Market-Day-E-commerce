"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";
import { useNotifikasi } from "@/components/Notifikasi/Notifikasi";
import { unduhDetailPesanan } from "@/lib/unduhPesanan";
import "./tombolUnduhPesanan.css";

/**
 * Tombol "Unduh detail pesanan".
 *
 * varian: "garis" (default) untuk di dalam kartu, "isi" untuk aksi utama.
 */
export default function TombolUnduhPesanan({
  pesanan,
  varian = "garis",
  label = "Unduh detail pesanan",
  className = "",
}) {
  const notifikasi = useNotifikasi();
  const [sedangMenyiapkan, setSedangMenyiapkan] = useState(false);

  async function unduh() {
    if (sedangMenyiapkan) return;
    setSedangMenyiapkan(true);

    try {
      await unduhDetailPesanan(pesanan);
      notifikasi.sukses(
        "Gambar detail pesanan sudah tersimpan di perangkatmu.",
        { judul: "Unduhan siap" },
      );
    } catch (galat) {
      // Alasan teknis tidak boleh sampai ke pembeli.
      console.error("Gagal membuat gambar pesanan:", galat);
      notifikasi.galat(
        "Gambar pesanan gagal dibuat. Silakan coba lagi, atau hubungi operator situs bila masalah ini berlanjut.",
        { judul: "Gagal mengunduh" },
      );
    } finally {
      setSedangMenyiapkan(false);
    }
  }

  return (
    <button
      type="button"
      className={`tombol-unduh-pesanan tombol-unduh-pesanan--${varian} ${className}`.trim()}
      onClick={unduh}
      disabled={sedangMenyiapkan}
    >
      <FiDownload aria-hidden="true" />
      {sedangMenyiapkan ? "Menyiapkan gambar..." : label}
    </button>
  );
}
