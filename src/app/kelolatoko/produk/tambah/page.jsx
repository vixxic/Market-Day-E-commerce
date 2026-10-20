"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import { permintaanKelolaToko } from "@/lib/kelolaTokoClient";

export default function TambahProdukPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama: "",
    harga: "",
    kategori: "",
    image: "",
    deskripsi: "",
    rasa: "",
    ukuran: "",
  });
  const [error, setError] = useState("");
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  function ubah(field, value) {
    setForm((data) => ({ ...data, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSedangMenyimpan(true);

    const data = {
      ...form,
      harga: Number(form.harga),
      image: form.image
        .split(/\n|,/)
        .map((url) => url.trim())
        .filter(Boolean),
      rasa: form.rasa
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      ukuran: form.ukuran
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    try {
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
    }
  }

  return (
    <KelolaLayout>
      <main>
        <h1 className="kelola-toko__judul">Tambah produk</h1>
        {error && <p className="kelola-toko__galat" role="alert">{error}</p>}
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
          <label className="kelola-toko__bidang">
            Kategori *
            <input
              required
              value={form.kategori}
              onChange={(event) => ubah("kategori", event.target.value)}
            />
          </label>
          <label className="kelola-toko__bidang">
            URL gambar produk *
            <textarea
              required
              placeholder="Tempel URL gambar. Pisahkan beberapa URL dengan koma atau baris baru."
              value={form.image}
              onChange={(event) => ubah("image", event.target.value)}
            />
            <p className="kelola-toko__bantuan">
              API produk menggunakan field image. Gambar perlu diunggah ke penyimpanan gambar terlebih dahulu.
            </p>
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
            {sedangMenyimpan ? "Menyimpan..." : "Simpan produk"}
          </button>
        </form>
      </main>
    </KelolaLayout>
  );
}
