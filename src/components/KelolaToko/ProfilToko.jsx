"use client";

import "./ProfilToko.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FiArrowLeft,
  FiCamera,
  FiExternalLink,
  FiTrash2,
} from "react-icons/fi";

import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import { useAuthContext } from "@/Context/AuthContext";
import { permintaanKelolaToko } from "@/lib/kelolaTokoClient";
import { unggahFotoProfil } from "@/lib/supabaseStorage";

const FORMAT_FOTO = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const BATAS_FOTO = 5 * 1024 * 1024;

function inisial(nama) {
  return String(nama ?? "Toko")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join("")
    .toUpperCase();
}

export default function ProfilToko() {
  const { toko } = useAuthContext();
  const avatarRef = useRef(null);
  const bannerRef = useRef(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengunggah, setMengunggah] = useState("");
  const [profilTersedia, setProfilTersedia] = useState(true);
  const [error, setError] = useState("");
  const [pesan, setPesan] = useState("");
  const [dataToko, setDataToko] = useState(null);
  const [form, setForm] = useState({
    deskripsi: "",
    lokasi: "",
    whatsappNumber: "",
    fotoProfil: "",
    banner: "",
  });

  useEffect(() => {
    let aktif = true;

    permintaanKelolaToko("/api/toko/profil")
      .then((hasil) => {
        if (!aktif) return;
        const profil = hasil.toko ?? {};
        setDataToko(profil);
        setProfilTersedia(hasil.profilTersedia !== false);
        setForm({
          deskripsi: profil.deskripsi ?? "",
          lokasi: profil.lokasi ?? "",
          whatsappNumber: profil.whatsappNumber ?? "",
          fotoProfil: profil.fotoProfil ?? "",
          banner: profil.banner ?? "",
        });
        setError("");
      })
      .catch((galat) => {
        if (aktif) setError(galat.message);
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, []);

  function ubah(field, nilai) {
    setForm((sebelumnya) => ({ ...sebelumnya, [field]: nilai }));
    setPesan("");
  }

  async function unggahFoto(event, jenis) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!FORMAT_FOTO.includes(file.type) || file.size > BATAS_FOTO) {
      setError(
        "Foto harus berformat JPG, PNG, WebP, atau AVIF dengan ukuran maksimal 5 MB.",
      );
      return;
    }

    setError("");
    setPesan("");
    setMengunggah(jenis);

    try {
      const url = await unggahFotoProfil(file, jenis);
      ubah(jenis === "banner" ? "banner" : "fotoProfil", url);
      setPesan(
        `${jenis === "banner" ? "Banner" : "Foto profil"} berhasil diunggah. Tekan simpan untuk menerapkan.`,
      );
    } catch (galat) {
      setError(galat.message);
    } finally {
      setMengunggah("");
    }
  }

  async function simpan(event) {
    event.preventDefault();
    setMenyimpan(true);
    setError("");
    setPesan("");

    try {
      const hasil = await permintaanKelolaToko("/api/toko/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deskripsi: form.deskripsi,
          lokasi: form.lokasi,
          whatsappNumber: form.whatsappNumber,
          fotoProfil: form.fotoProfil || null,
          banner: form.banner || null,
        }),
      });

      setDataToko(hasil.toko);
      setProfilTersedia(hasil.profilTersedia !== false);
      setPesan("Profil toko berhasil disimpan.");
    } catch (galat) {
      setError(galat.message);
    } finally {
      setMenyimpan(false);
    }
  }

  const namaToko = dataToko?.namaToko ?? toko?.namaToko ?? "Toko";
  const sedangSibuk = menyimpan;

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
          <h1 className="kelola-toko__bar-judul">Profil Toko</h1>
        </header>

        {memuat && <p>Memuat profil toko...</p>}

        {error && (
          <p className="kelola-toko__galat" role="alert">
            {error}
          </p>
        )}

        {pesan && (
          <p className="profil-toko__sukses" role="status">
            {pesan}
          </p>
        )}

        {!memuat && !profilTersedia && (
          <p className="profil-toko__peringatan">
            Kolom profil toko belum tersedia di database. Jalankan migrasi{" "}
            <code>
              supabase/migrations/20261028120000_add_store_profiles_and_analytics.sql
            </code>{" "}
            lalu muat ulang halaman ini.
          </p>
        )}

        {!memuat && (
          <section className="profil-toko">
            <div className="profil-toko__preview">
              <div
                className={
                  "profil-toko__banner" +
                  (form.banner ? " profil-toko__banner--foto" : "")
                }
                style={
                  form.banner
                    ? { backgroundImage: `url("${form.banner}")` }
                    : undefined
                }
              >
                <button
                  type="button"
                  className="profil-toko__ubah-banner"
                  disabled={Boolean(mengunggah) || sedangSibuk}
                  onClick={() => bannerRef.current?.click()}
                >
                  <FiCamera aria-hidden="true" />
                  {mengunggah === "banner"
                    ? "Mengunggah..."
                    : "Ganti banner"}
                </button>
                {form.banner && (
                  <button
                    type="button"
                    className="profil-toko__hapus-banner"
                    disabled={Boolean(mengunggah) || sedangSibuk}
                    aria-label="Hapus banner"
                    onClick={() => ubah("banner", "")}
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="profil-toko__identitas">
                <div className="profil-toko__avatar">
                  {form.fotoProfil ? (
                    <img src={form.fotoProfil} alt={namaToko} />
                  ) : (
                    <span aria-hidden="true">{inisial(namaToko)}</span>
                  )}
                  <button
                    type="button"
                    className="profil-toko__ubah-avatar"
                    disabled={Boolean(mengunggah) || sedangSibuk}
                    aria-label="Ganti foto profil"
                    onClick={() => avatarRef.current?.click()}
                  >
                    <FiCamera aria-hidden="true" />
                  </button>
                  {form.fotoProfil && (
                    <button
                      type="button"
                      className="profil-toko__hapus-avatar"
                      disabled={Boolean(mengunggah) || sedangSibuk}
                      aria-label="Hapus foto profil"
                      onClick={() => ubah("fotoProfil", "")}
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="profil-toko__preview-teks">
                  <strong>{namaToko}</strong>
                  <span>Pratinjau identitas toko di halaman publik</span>
                  {toko?.id && (
                    <Link href={`/toko/${toko.id}`} target="_blank">
                      Buka halaman toko <FiExternalLink aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>

              <input
                ref={bannerRef}
                type="file"
                accept={FORMAT_FOTO.join(",")}
                hidden
                onChange={(event) => unggahFoto(event, "banner")}
              />
              <input
                ref={avatarRef}
                type="file"
                accept={FORMAT_FOTO.join(",")}
                hidden
                onChange={(event) => unggahFoto(event, "avatar")}
              />
            </div>

            <form className="profil-toko__form" onSubmit={simpan}>
              <label className="profil-toko__bidang">
                <span>Deskripsi toko</span>
                <textarea
                  maxLength={600}
                  rows={5}
                  value={form.deskripsi}
                  onChange={(event) => ubah("deskripsi", event.target.value)}
                  placeholder="Ceritakan produk andalan atau suasana tokomu..."
                  disabled={sedangSibuk}
                />
                <small>{form.deskripsi.length}/600 karakter</small>
              </label>

              <div className="profil-toko__baris">
                <label className="profil-toko__bidang">
                  <span>Lokasi di sekolah</span>
                  <input
                    type="text"
                    maxLength={120}
                    value={form.lokasi}
                    onChange={(event) => ubah("lokasi", event.target.value)}
                    placeholder="Contoh: Kelas 9A / Kantin"
                    disabled={sedangSibuk}
                  />
                </label>

                <label className="profil-toko__bidang">
                  <span>Nomor WhatsApp</span>
                  <input
                    type="tel"
                    maxLength={30}
                    value={form.whatsappNumber}
                    onChange={(event) =>
                      ubah("whatsappNumber", event.target.value)
                    }
                    placeholder="08xxxxxxxxxx"
                    disabled={sedangSibuk}
                  />
                </label>
              </div>

              <p className="profil-toko__bantuan">
                Foto dan banner maksimal 5 MB. Gunakan gambar JPG, PNG, WebP,
                atau AVIF. Perubahan baru tampil di halaman toko setelah
                disimpan.
              </p>

              <div className="profil-toko__aksi">
                <button type="submit" disabled={sedangSibuk}>
                  {menyimpan ? "Menyimpan..." : "Simpan profil"}
                </button>
                {toko?.id && (
                  <Link
                    className="profil-toko__tombol-sekunder"
                    href={`/toko/${toko.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lihat halaman toko
                  </Link>
                )}
              </div>
            </form>
          </section>
        )}
      </main>
    </KelolaLayout>
  );
}
