"use client";

import { useId } from "react";
import {
  PROMO_BELI_GRATIS,
  PROMO_DISKON_JUMLAH,
  labelPromo,
  validasiPromoForm,
} from "@/lib/promoProduk";

/** Isian awal form promo (semua angka disimpan sebagai teks input). */
export const PROMO_FORM_AWAL = {
  jenis: "",
  beli: "2",
  gratis: "1",
  minJumlah: "3",
  tipe: "persen",
  nilai: "10",
};

/** Mengubah promo tersimpan dari database menjadi isian form. */
export function promoKeForm(promo) {
  if (!promo || typeof promo !== "object") return { ...PROMO_FORM_AWAL };

  if (promo.jenis === PROMO_BELI_GRATIS) {
    return {
      ...PROMO_FORM_AWAL,
      jenis: PROMO_BELI_GRATIS,
      beli: String(promo.beli ?? PROMO_FORM_AWAL.beli),
      gratis: String(promo.gratis ?? PROMO_FORM_AWAL.gratis),
    };
  }

  if (promo.jenis === PROMO_DISKON_JUMLAH) {
    return {
      ...PROMO_FORM_AWAL,
      jenis: PROMO_DISKON_JUMLAH,
      minJumlah: String(promo.minJumlah ?? PROMO_FORM_AWAL.minJumlah),
      tipe: promo.tipe === "nominal" ? "nominal" : "persen",
      nilai: String(promo.nilai ?? PROMO_FORM_AWAL.nilai),
    };
  }

  return { ...PROMO_FORM_AWAL };
}

/** Mengubah isian form menjadi promo untuk dikirim ke API. */
export function promoDariForm(data) {
  if (!data || !data.jenis) return null;

  if (data.jenis === PROMO_BELI_GRATIS) {
    return {
      jenis: PROMO_BELI_GRATIS,
      beli: Number(data.beli),
      gratis: Number(data.gratis),
    };
  }

  if (data.jenis === PROMO_DISKON_JUMLAH) {
    return {
      jenis: PROMO_DISKON_JUMLAH,
      minJumlah: Number(data.minJumlah),
      tipe: data.tipe === "nominal" ? "nominal" : "persen",
      nilai: Number(data.nilai),
    };
  }

  return null;
}

const PILIHAN = [
  { nilai: "", label: "Tanpa promo" },
  { nilai: PROMO_BELI_GRATIS, label: "Beli N gratis M" },
  { nilai: PROMO_DISKON_JUMLAH, label: "Diskon jumlah" },
];

/**
 * Fieldset promo untuk form tambah/edit produk.
 * `data` berbentuk PROMO_FORM_AWAL; `onUbah` menerima objek form baru.
 */
export default function FormPromo({ data, onUbah, nonaktif }) {
  const id = useId();

  function ubah(field, value) {
    onUbah({ ...data, [field]: value });
  }

  const promo = promoDariForm(data);
  const galat = data.jenis ? validasiPromoForm(promo) : "";
  const ringkas = data.jenis && !galat ? labelPromo(promo) : "";

  return (
    <fieldset className="kelola-toko__bidang kelola-toko__promo">
      <legend>Promo (opsional)</legend>
      <p className="kelola-toko__bantuan">
        Promo dihitung otomatis saat pembeli memesan. Boleh dikosongkan bila
        produk tidak sedang promo.
      </p>

      <div
        className="kelola-toko__promo-pilihan"
        role="group"
        aria-label="Pilih jenis promo"
      >
        {PILIHAN.map((pilihan) => (
          <button
            key={pilihan.nilai || "tanpa"}
            type="button"
            className={
              "kelola-toko__kategori-tag" +
              (data.jenis === pilihan.nilai
                ? " kelola-toko__kategori-tag--aktif"
                : "")
            }
            aria-pressed={data.jenis === pilihan.nilai}
            disabled={nonaktif}
            onClick={() => ubah("jenis", pilihan.nilai)}
          >
            {pilihan.label}
          </button>
        ))}
      </div>

      {data.jenis === PROMO_BELI_GRATIS && (
        <div className="kelola-toko__promo-baris">
          <label className="kelola-toko__bidang kelola-toko__bidang--ringkas">
            <span>Beli (pcs)</span>
            <input
              type="number"
              min="1"
              max="20"
              step="1"
              disabled={nonaktif}
              value={data.beli}
              onChange={(event) => ubah("beli", event.target.value)}
            />
          </label>
          <label className="kelola-toko__bidang kelola-toko__bidang--ringkas">
            <span>Gratis (pcs)</span>
            <input
              type="number"
              min="1"
              max="20"
              step="1"
              disabled={nonaktif}
              value={data.gratis}
              onChange={(event) => ubah("gratis", event.target.value)}
            />
          </label>
        </div>
      )}

      {data.jenis === PROMO_DISKON_JUMLAH && (
        <div className="kelola-toko__promo-baris kelola-toko__promo-baris--tiga">
          <label className="kelola-toko__bidang kelola-toko__bidang--ringkas">
            <span>Minimal beli (pcs)</span>
            <input
              type="number"
              min="2"
              max="99"
              step="1"
              disabled={nonaktif}
              value={data.minJumlah}
              onChange={(event) => ubah("minJumlah", event.target.value)}
            />
          </label>
          <label className="kelola-toko__bidang kelola-toko__bidang--ringkas">
            <span>Jenis potongan</span>
            <select
              disabled={nonaktif}
              value={data.tipe}
              onChange={(event) => ubah("tipe", event.target.value)}
            >
              <option value="persen">Persen (%)</option>
              <option value="nominal">Nominal (Rp)</option>
            </select>
          </label>
          <label className="kelola-toko__bidang kelola-toko__bidang--ringkas">
            <span>
              {data.tipe === "nominal" ? "Potongan per item (Rp)" : "Diskon (%)"}
            </span>
            <input
              type="number"
              min="1"
              max={data.tipe === "nominal" ? "10000000" : "100"}
              step="1"
              disabled={nonaktif}
              value={data.nilai}
              onChange={(event) => ubah("nilai", event.target.value)}
            />
          </label>
        </div>
      )}

      {galat && (
        <p className="kelola-toko__promo-galat" role="alert">
          {galat}
        </p>
      )}

      {ringkas && (
        <p className="kelola-toko__promo-ringkas" id={`${id}-ringkas`}>
          Tampil di toko: <strong>{ringkas}</strong>
        </p>
      )}
    </fieldset>
  );
}
