"use client";

import { useEffect, useRef, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";

/**
 * Pratinjau file foto yang belum diunggah. Object URL dibuat sekali per file
 * dan dilepas saat pratinjau dilepas dari halaman.
 */
export function PratinjauFoto({ file }) {
  const [sumber] = useState(() =>
    file && typeof URL !== "undefined" ? URL.createObjectURL(file) : "",
  );

  useEffect(() => {
    if (!sumber) return undefined;
    return () => URL.revokeObjectURL(sumber);
  }, [sumber]);

  if (!sumber) return null;

  return (
    <img
      className="kelola-toko__foto-pratinjau"
      src={sumber}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * Area unggah foto dengan drag-and-drop dan tombol pilih gambar.
 *
 * Props:
 * - id       : id unik untuk input file
 * - judul    : label di atas area unggah
 * - bantuan  : teks bantuan di bawah area unggah
 * - nonaktif : menonaktifkan tombol dan drop
 * - onPilih  : dipanggil dengan File[] hasil pilih atau drop
 */
export default function UnggahFoto({
  id,
  judul = "Foto produk",
  bantuan,
  nonaktif = false,
  onPilih,
}) {
  const inputRef = useRef(null);
  const hitungDrag = useRef(0);
  const [aktif, setAktif] = useState(false);

  function kirim(files) {
    const daftar = Array.from(files ?? []);
    if (daftar.length > 0) onPilih?.(daftar);
  }

  function saatMasuk(event) {
    event.preventDefault();
    if (nonaktif) return;

    hitungDrag.current += 1;
    if (event.dataTransfer?.types?.includes("Files")) setAktif(true);
  }

  function saatLewat(event) {
    event.preventDefault();
    if (nonaktif) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    event.dataTransfer.dropEffect = "copy";
  }

  function saatKeluar(event) {
    if (nonaktif) return;

    hitungDrag.current = Math.max(0, hitungDrag.current - 1);
    if (hitungDrag.current === 0) setAktif(false);
  }

  function saatLepas(event) {
    event.preventDefault();
    hitungDrag.current = 0;
    setAktif(false);
    if (!nonaktif) kirim(event.dataTransfer?.files);
  }

  return (
    <div className="kelola-toko__bidang">
      <span className="kelola-toko__label">{judul}</span>

      <div
        className={
          "kelola-toko__dropzone" +
          (aktif ? " kelola-toko__dropzone--aktif" : "") +
          (nonaktif ? " kelola-toko__dropzone--nonaktif" : "")
        }
        onDragEnter={saatMasuk}
        onDragOver={saatLewat}
        onDragLeave={saatKeluar}
        onDrop={saatLepas}
      >
        <FiUploadCloud
          className="kelola-toko__dropzone-ikon"
          aria-hidden="true"
        />
        <p className="kelola-toko__dropzone-teks">
          Tarik dan lepas foto ke sini
        </p>
        <span className="kelola-toko__dropzone-atau">atau</span>
        <button
          type="button"
          className="kelola-toko__pilih-gambar"
          disabled={nonaktif}
          aria-describedby={bantuan ? `${id}-bantuan` : undefined}
          onClick={() => inputRef.current?.click()}
        >
          Pilih gambar
        </button>
        <input
          ref={inputRef}
          id={id}
          className="kelola-toko__input-berkas"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={nonaktif}
          onChange={(event) => {
            kirim(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {bantuan && (
        <p className="kelola-toko__bantuan" id={`${id}-bantuan`}>
          {bantuan}
        </p>
      )}
    </div>
  );
}
