"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import { permintaanKelolaToko } from "@/lib/kelolaTokoClient";
import { unggahFotoProduk } from "@/lib/supabaseStorage";
import { ambilProdukById } from "@/lib/api/produkApi";
import { Suspense } from "react";
import { KATEGORI_PRODUK } from "@/lib/kategoriProduk";

function daftarGambarProduk(produk) {
  const sumber =
    Array.isArray(produk.gambar_list) && produk.gambar_list.length > 0
      ? produk.gambar_list
      : produk.image ?? produk.gambar;
  return (Array.isArray(sumber) ? sumber : typeof sumber === "string" ? [sumber] : [])
    .filter((gambar) => typeof gambar === "string" && gambar.trim());
}

function EditProdukContent({ params }) {
  const router = useRouter();
  const [foto, setFoto] = useState([]);
  const [gambarTersimpan, setGambarTersimpan] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    harga: "",
    stok: "0",
    kategori: [],
    deskripsi: "",
    rasa: "",
    ukuran: "",
  });
  const [error, setError] = useState("");
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [tahapSimpan, setTahapSimpan] = useState("");
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    async function muatProduk() {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const produk = await ambilProdukById(id);
        if (!produk) {
          setError("Produk tidak ditemukan.");
          return;
        }

        setForm({
          nama: produk.nama || "",
          harga: String(produk.harga || ""),
          stok: String(produk.stok ?? 0),
          kategori: Array.isArray(produk.kategori) ? produk.kategori : [],
          deskripsi: produk.deskripsi || "",
          rasa: Array.isArray(produk.rasa) ? produk.rasa.join(", ") : (produk.rasa || ""),
          ukuran: Array.isArray(produk.ukuran) ? produk.ukuran.join(", ") : (produk.ukuran || ""),
        });
        setGambarTersimpan(daftarGambarProduk(produk));
      } catch (galat) {
        setError("Gagal memuat data produk: " + galat.message);
      } finally {
        setMemuat(false);
      }
    }
    muatProduk();
  }, [params]);

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

    if (gambarTersimpan.length + foto.length + fileTerpilih.length > 5) {
      event.target.value = "";
      setError("Produk hanya boleh memiliki maksimal 5 foto.");
      return;
    }

    const fotoTidakValid = fileTerpilih.find(
      (file) =>
        !formatDidukung.includes(file.type) || file.size > 5 * 1024 * 1024,
    );
    if (fotoTidakValid) {
      event.target.value = "";
      setError(
        "Foto harus berformat JPG, PNG, WebP, atau AVIF dengan ukuran maksimal 5 MB per foto.",
      );
      return;
    }

    setFoto((sebelumnya) => [...sebelumnya, ...fileTerpilih]);
    event.target.value = "";
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    
    if (form.kategori.length === 0) {
      setError("Pilih minimal satu kategori produk.");
      return;
    }
    if (gambarTersimpan.length + foto.length === 0) {
      setError("Pilih minimal satu foto produk.");
      return;
    }

    setSedangMenyimpan(true);

    try {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      let image = [...gambarTersimpan];

      if (foto.length > 0) {
        setTahapSimpan("Mengunggah foto...");
        const uploadedImages = await Promise.all(foto.map(unggahFotoProduk));
        image = [...image, ...uploadedImages];
      }

      const data = {
        ...form,
        harga: Number(form.harga),
        stok: Number(form.stok),
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

      setTahapSimpan("Menyimpan perubahan...");
      await permintaanKelolaToko(`/api/toko/produk/${id}`, {
        method: "PATCH",
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

  if (memuat) {
    return <KelolaLayout><main className="kelola-toko__memuat">Memuat data produk...</main></KelolaLayout>;
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
          <h1 className="kelola-toko__bar-judul">Edit Produk</h1>
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
          <label className="kelola-toko__bidang">
            Stok *
            <input
              required
              type="number"
              min="0"
              max="2147483647"
              step="1"
              value={form.stok}
              onChange={(event) => ubah("stok", event.target.value)}
            />
            <span className="kelola-toko__bantuan">
              Masukkan jumlah produk yang tersedia.
            </span>
          </label>
          <fieldset className="kelola-toko__bidang kelola-toko__kategori">
            <legend>Kategori *</legend>
            <div
              className="kelola-toko__pilihan-kategori"
              role="group"
              aria-label="Pilih satu atau beberapa kategori"
            >
              {KATEGORI_PRODUK.map((kategori) => {
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
          <div className="kelola-toko__bidang">
            <label htmlFor="foto-produk">Ganti Foto (Opsional)</label>
            <input
              id="foto-produk"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              disabled={sedangMenyimpan || gambarTersimpan.length + foto.length >= 5}
              onChange={pilihFoto}
            />
            <p className="kelola-toko__bantuan">
              Pilih hingga 5 foto total. JPG, PNG, WebP, atau AVIF; maksimal 5 MB per foto.
            </p>
            {(gambarTersimpan.length > 0 || foto.length > 0) && (
              <ul className="kelola-toko__daftar-foto">
                {gambarTersimpan.map((gambar, indeks) => (
                  <li key={`${gambar}-${indeks}`}>
                    <span>Foto tersimpan {indeks + 1}</span>
                    <button
                      type="button"
                      className="kelola-toko__hapus-foto"
                      disabled={sedangMenyimpan}
                      aria-label={`Hapus foto tersimpan ${indeks + 1}`}
                      onClick={() =>
                        setGambarTersimpan((daftar) =>
                          daftar.filter((_, posisi) => posisi !== indeks),
                        )
                      }
                    >
                      Hapus
                    </button>
                  </li>
                ))}
                {foto.map((file, indeks) => (
                  <li key={`${file.name}-${file.lastModified}`}>
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="kelola-toko__hapus-foto"
                      disabled={sedangMenyimpan}
                      aria-label={`Hapus foto baru ${file.name}`}
                      onClick={() =>
                        setFoto((daftar) =>
                          daftar.filter((_, posisi) => posisi !== indeks),
                        )
                      }
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
            {sedangMenyimpan ? tahapSimpan : "Simpan perubahan"}
          </button>
        </form>
      </main>
    </KelolaLayout>
  );
}

export default function EditProdukPage({ params }) {
  return (
    <Suspense fallback={<main className="kelola-toko__memuat">Memuat...</main>}>
      <EditProdukContent params={params} />
    </Suspense>
  );
}
