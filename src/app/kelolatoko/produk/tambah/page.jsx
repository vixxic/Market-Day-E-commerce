"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import { permintaanKelolaToko } from "@/lib/kelolaTokoClient";
import { unggahFotoProduk } from "@/lib/supabaseStorage";

const PILIHAN_KATEGORI = [
  "Manis",
  "Asin",
  "Pedas",
  "Asam",
  "Gurih",
  "Segar",
  "Sehat",
  "Camilan",
  "Makanan Berat",
  "Minuman",
  "Dessert",
  "Kue & Roti",
];

export default function TambahProdukPage() {
  const router = useRouter();
  const [foto, setFoto] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    harga: "",
    kategori: [],
    deskripsi: "",
    rasa: "",
    ukuran: "",
  });
  const [error, setError] = useState("");
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [tahapSimpan, setTahapSimpan] = useState("");

  function ubah(field, value) {
    setForm((data) => ({ ...data, [field]: value }));
  }

  function pilihKategori(kategori) {
    setForm((data) => ({
      ...data,
      kategori: data.kategori.includes(kategori)
        ? data.kategori.filter((pilihan) => pilihan !== kategori)
        : [...data.kategori, kategori],
    }));
  }

  function pilihFoto(event) {
    const fileTerpilih = Array.from(event.target.files ?? []);
    const formatDidukung = ["image/avif", "image/jpeg", "image/png", "image/webp"];

    if (fileTerpilih.length > 5) {
      setFoto([]);
      event.target.value = "";
      setError("Pilih maksimal 5 foto produk.");
      return;
    }

    const fotoTidakValid = fileTerpilih.find(
      (file) =>
        !formatDidukung.includes(file.type) || file.size > 5 * 1024 * 1024,
    );
    if (fotoTidakValid) {
      setFoto([]);
      event.target.value = "";
      setError(
        "Foto harus berformat JPG, PNG, WebP, atau AVIF dengan ukuran maksimal 5 MB per foto.",
      );
      return;
    }

    setFoto(fileTerpilih);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (foto.length === 0) {
      setError("Pilih minimal satu foto produk.");
      return;
    }
    if (form.kategori.length === 0) {
      setError("Pilih minimal satu kategori produk.");
      return;
    }

    setSedangMenyimpan(true);

    try {
      setTahapSimpan("Mengunggah foto...");
      const image = await Promise.all(foto.map(unggahFotoProduk));
      const data = {
        ...form,
        harga: Number(form.harga),
        image,
        rasa: form.rasa
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        ukuran: form.ukuran
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      setTahapSimpan("Menyimpan produk...");
      await permintaanKelolaToko("/api/toko/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.replace("/kelolatoko");
    } catch (galat) {
      setError(galat.message);
    } finally {
      setSedangMenyimpan(false);
      setTahapSimpan("");
    }
  }

  return (
    <KelolaLayout>
      <main>
        <header className="kelola-toko__bar">
          <Link
            className="kelola-toko__bar-kembali"
            href="/kelolatoko"
            aria-label="Kembali ke kelola toko"
          >
            <FiArrowLeft aria-hidden="true" />
          </Link>
          <h1 className="kelola-toko__bar-judul">Tambah Produk</h1>
        </header>
        {error && (
          <p className="kelola-toko__galat" role="alert">
            {error}
          </p>
        )}
        <form className="kelola-toko__form" onSubmit={submit}>
          <label className="kelola-toko__bidang">
            Nama produk *
            <input
              required
              maxLength={120}
              value={form.nama}
              onChange={(event) => ubah("nama", event.target.value)}
            />
          </label>
          <label className="kelola-toko__bidang">
            Harga *
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.harga}
              onChange={(event) => ubah("harga", event.target.value)}
            />
          </label>
          <fieldset className="kelola-toko__bidang kelola-toko__kategori">
            <legend>Kategori *</legend>
            <div
              className="kelola-toko__pilihan-kategori"
              role="group"
              aria-label="Pilih satu atau beberapa kategori"
            >
              {PILIHAN_KATEGORI.map((kategori) => {
                const dipilih = form.kategori.includes(kategori);
                return (
                  <button
                    key={kategori}
                    type="button"
                    className={
                      "kelola-toko__kategori-tag" +
                      (dipilih ? " kelola-toko__kategori-tag--aktif" : "")
                    }
                    aria-pressed={dipilih}
                    disabled={sedangMenyimpan}
                    onClick={() => pilihKategori(kategori)}
                  >
                    {kategori}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="kelola-toko__bidang">
            Foto produk *
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              required
              disabled={sedangMenyimpan}
              onChange={pilihFoto}
            />
            <p className="kelola-toko__bantuan">
              Pilih maksimal 5 foto JPG, PNG, WebP, atau AVIF. Ukuran maksimal 5 MB per foto.
            </p>
            {foto.length > 0 && (
              <ul className="kelola-toko__daftar-foto">
                {foto.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>
                    {file.name}
                  </li>
                ))}
              </ul>
            )}
          </label>
          <label className="kelola-toko__bidang">
            Deskripsi
            <textarea
              value={form.deskripsi}
              onChange={(event) => ubah("deskripsi", event.target.value)}
            />
          </label>
          <label className="kelola-toko__bidang">
            Jenis/rasa (pisahkan dengan koma)
            <input
              value={form.rasa}
              onChange={(event) => ubah("rasa", event.target.value)}
            />
          </label>
          <label className="kelola-toko__bidang">
            Ukuran (pisahkan dengan koma)
            <input
              value={form.ukuran}
              onChange={(event) => ubah("ukuran", event.target.value)}
            />
          </label>
          <button
            className="kelola-toko__tombol"
            type="submit"
            disabled={sedangMenyimpan}
          >
            {sedangMenyimpan ? tahapSimpan : "Simpan produk"}
          </button>
        </form>
      </main>
    </KelolaLayout>
  );
}
