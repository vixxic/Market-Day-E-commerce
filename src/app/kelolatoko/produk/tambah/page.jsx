"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import UnggahFoto, {
  PratinjauFoto,
} from "@/components/KelolaToko/UnggahFoto";
import FormPromo, {
  PROMO_FORM_AWAL,
  promoDariForm,
} from "@/components/KelolaToko/FormPromo";
import { useNotifikasi } from "@/components/Notifikasi/Notifikasi";
import { permintaanKelolaToko } from "@/lib/kelolaTokoClient";
import { unggahFotoProduk } from "@/lib/supabaseStorage";
import { KATEGORI_PRODUK } from "@/lib/kategoriProduk";
import { validasiUkuranForm } from "@/lib/ukuranProduk";
import { validasiPromoForm } from "@/lib/promoProduk";

const FORMAT_FOTO = ["image/avif", "image/jpeg", "image/png", "image/webp"];
const MAKS_FOTO = 5;
const UKURAN_MAKS = 10;
const BATAS_UKURAN_FOTO = 2 * 1024 * 1024;

export default function TambahProdukPage() {
  const router = useRouter();
  const notifikasi = useNotifikasi();
  const [foto, setFoto] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    harga: "",
    stok: "",
    kategori: [],
    deskripsi: "",
    rasa: "",
    ukuran: [],
  });
  const [promoForm, setPromoForm] = useState({ ...PROMO_FORM_AWAL });
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

  function pilihFoto(fileTerpilih) {
    const fotoBaru = fileTerpilih.filter(
      (file) =>
        !foto.some(
          (terpilih) =>
            terpilih.name === file.name &&
            terpilih.size === file.size &&
            terpilih.lastModified === file.lastModified,
        ),
    );

    if (foto.length + fotoBaru.length > MAKS_FOTO) {
      notifikasi.galat(
        `Produk hanya boleh memiliki maksimal ${MAKS_FOTO} foto.`,
      );
      return;
    }

    const fotoTidakValid = fileTerpilih.find(
      (file) =>
        !FORMAT_FOTO.includes(file.type) || file.size > BATAS_UKURAN_FOTO,
    );
    if (fotoTidakValid) {
      notifikasi.galat(
        "Foto harus berformat JPG, PNG, WebP, atau AVIF dengan ukuran maksimal 2 MB per foto.",
      );
      return;
    }

    setFoto((sebelumnya) => [...sebelumnya, ...fotoBaru]);
  }

  function tambahUkuran() {
    setForm((data) => {
      if (data.ukuran.length >= UKURAN_MAKS) return data;

      const hargaAwal =
        data.ukuran[data.ukuran.length - 1]?.harga || data.harga || "";

      return {
        ...data,
        ukuran: [...data.ukuran, { nama: "", harga: String(hargaAwal) }],
      };
    });
  }

  function ubahUkuran(indeks, field, value) {
    setForm((data) => ({
      ...data,
      ukuran: data.ukuran.map((item, posisi) =>
        posisi === indeks ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function hapusUkuran(indeks) {
    setForm((data) => {
      const hargaTerhapus = data.ukuran[indeks]?.harga;
      const ukuran = data.ukuran.filter((_, posisi) => posisi !== indeks);

      return {
        ...data,
        ukuran,
        // Saat ukuran terakhir dihapus, kembalikan harganya ke harga tunggal.
        harga:
          ukuran.length === 0 && hargaTerhapus
            ? String(hargaTerhapus)
            : data.harga,
      };
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (foto.length === 0) {
      notifikasi.galat("Pilih minimal satu foto produk.");
      return;
    }
    if (form.kategori.length === 0) {
      notifikasi.galat("Pilih minimal satu kategori produk.");
      return;
    }

    if (form.ukuran.length > 0) {
      const galatUkuran = validasiUkuranForm(form.ukuran);
      if (galatUkuran) {
        notifikasi.galat(galatUkuran);
        return;
      }
    } else if (!(Number(form.harga) > 0)) {
      notifikasi.galat("Harga produk wajib diisi.");
      return;
    }

    const promo = promoDariForm(promoForm);
    const galatPromo = validasiPromoForm(promo);
    if (galatPromo) {
      notifikasi.galat(galatPromo, { judul: "Promo belum valid" });
      return;
    }

    setSedangMenyimpan(true);

    try {
      setTahapSimpan("Mengunggah foto...");
      const image = await Promise.all(foto.map(unggahFotoProduk));

      const ukuran = form.ukuran.map((item) => ({
        nama: item.nama.trim(),
        harga: Number(item.harga),
      }));
      const harga =
        ukuran.length > 0
          ? Math.min(...ukuran.map((item) => item.harga))
          : Number(form.harga);

      const data = {
        ...form,
        harga,
        ukuran,
        stok: Number(form.stok),
        image,
        rasa: form.rasa
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        promo,
      };

      setTahapSimpan("Menyimpan produk...");
      await permintaanKelolaToko("/api/toko/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      notifikasi.sukses("Produk berhasil ditambahkan.");
      router.replace("/kelolatoko");
    } catch (galat) {
      notifikasi.galat(galat.message, { judul: "Produk gagal disimpan" });
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

          {form.ukuran.length === 0 && (
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
              <span className="kelola-toko__bantuan">
                Harga tunggal dipakai karena produk belum punya ukuran.
              </span>
            </label>
          )}

          <fieldset className="kelola-toko__bidang kelola-toko__ukuran">
            <legend>Ukuran &amp; harga</legend>
            <p className="kelola-toko__bantuan">
              Tambahkan ukuran bila harga tiap ukuran berbeda. Produk tanpa
              ukuran memakai harga tunggal di atas.
            </p>

            {form.ukuran.length > 0 && (
              <ul className="kelola-toko__daftar-ukuran">
                {form.ukuran.map((item, indeks) => (
                  <li className="kelola-toko__baris-ukuran" key={indeks}>
                    <label className="kelola-toko__bidang kelola-toko__bidang--ringkas">
                      <span>Nama ukuran</span>
                      <input
                        maxLength={40}
                        placeholder="Contoh: Large"
                        value={item.nama}
                        onChange={(event) =>
                          ubahUkuran(indeks, "nama", event.target.value)
                        }
                      />
                    </label>
                    <label className="kelola-toko__bidang kelola-toko__bidang--ringkas">
                      <span>Harga</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="15000"
                        value={item.harga}
                        onChange={(event) =>
                          ubahUkuran(indeks, "harga", event.target.value)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="kelola-toko__hapus-foto"
                      disabled={sedangMenyimpan}
                      aria-label={`Hapus ukuran ${
                        item.nama || indeks + 1
                      }`}
                      onClick={() => hapusUkuran(indeks)}
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="kelola-toko__tombol kelola-toko__tombol--ringan kelola-toko__tambah-ukuran"
              disabled={sedangMenyimpan || form.ukuran.length >= UKURAN_MAKS}
              onClick={tambahUkuran}
            >
              + Tambah ukuran
            </button>
          </fieldset>

          <FormPromo
            data={promoForm}
            onUbah={setPromoForm}
            nonaktif={sedangMenyimpan}
          />

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

          <UnggahFoto
            id="foto-produk"
            judul="Foto produk *"
            bantuan={`Pilih maksimal ${MAKS_FOTO} foto JPG, PNG, WebP, atau AVIF. Ukuran maksimal 2 MB per foto.`}
            nonaktif={sedangMenyimpan || foto.length >= MAKS_FOTO}
            onPilih={pilihFoto}
          />

          {foto.length > 0 && (
            <ul className="kelola-toko__daftar-foto">
              {foto.map((file, indeks) => (
                <li key={`${file.name}-${file.lastModified}`}>
                  <PratinjauFoto file={file} />
                  <span className="kelola-toko__foto-nama">{file.name}</span>
                  <button
                    type="button"
                    className="kelola-toko__hapus-foto"
                    disabled={sedangMenyimpan}
                    aria-label={`Hapus foto ${file.name}`}
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
