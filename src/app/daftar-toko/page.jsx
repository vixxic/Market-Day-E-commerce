// "use client";

// import "./daftar-toko.css";
// import { useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useAuthContext } from "@/Context/AuthContext";

// export default function DaftarTokoPage() {
//   const { daftar } = useAuthContext();
//   const router = useRouter();
//   const [namaToko, setNamaToko] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [sedangMendaftar, setSedangMendaftar] = useState(false);

//   async function submit(event) {
//     event.preventDefault();
//     setError("");
//     setSedangMendaftar(true);
//     try {
//       await daftar(namaToko.trim(), password);
//       router.replace("/kelolatoko");
//     } catch (galat) {
//       setError(galat.message);
//     } finally {
//       setSedangMendaftar(false);
//     }
//   }

//   return (
//     <main className="daftar-toko">
//       <form className="daftar-toko__form" onSubmit={submit}>
//         <h1>Daftarkan Toko</h1>
//         <p>
//           Nama toko dan password digunakan untuk masuk ke halaman kelola toko.
//         </p>
//         {error && (
//           <p className="daftar-toko__error" role="alert">
//             {error}
//           </p>
//         )}
//         <label>
//           Nama toko
//           <input
//             autoComplete="organization"
//             minLength={2}
//             maxLength={80}
//             required
//             value={namaToko}
//             onChange={(event) => setNamaToko(event.target.value)}
//           />
//         </label>
//         <label>
//           Password toko
//           <input
//             type="password"
//             autoComplete="new-password"
//             minLength={6}
//             required
//             value={password}
//             onChange={(event) => setPassword(event.target.value)}
//           />
//         </label>
//         <button type="submit" disabled={sedangMendaftar}>
//           {sedangMendaftar ? "Mendaftarkan..." : "Daftarkan toko"}
//         </button>
//         <Link href="/masuktoko">Sudah punya toko? Masuk</Link>
//       </form>
//     </main>
//   );
// }

"use client";

import "./daftar-toko.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiCamera, FiImage } from "react-icons/fi";
import { useAuthContext } from "@/Context/AuthContext";
// Sesuaikan path import ini dengan yang dipakai di halaman masuk toko
import NavigasiBawah from "@/components/NavigasiBawah/NavigasiBawah";
import { permintaanKelolaToko } from "@/lib/kelolaTokoClient";
import { unggahFotoProfil } from "@/lib/supabaseStorage";

const FORMAT_FOTO = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const BATAS_FOTO = 5 * 1024 * 1024;

export default function DaftarTokoPage() {
  const { daftar } = useAuthContext();
  const router = useRouter();
  const [namaToko, setNamaToko] = useState("");
  const [password, setPassword] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [fotoProfil, setFotoProfil] = useState(null);
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState("");
  const [gagalProfil, setGagalProfil] = useState(false);
  const [sedangMendaftar, setSedangMendaftar] = useState(false);

  useEffect(
    () => () => {
      if (fotoProfil) URL.revokeObjectURL(fotoProfil.preview);
    },
    [fotoProfil],
  );

  useEffect(
    () => () => {
      if (banner) URL.revokeObjectURL(banner.preview);
    },
    [banner],
  );

  function pilihFoto(event, jenis) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!FORMAT_FOTO.includes(file.type)) {
      setError("Foto harus berformat JPG, PNG, WebP, atau AVIF.");
      return;
    }
    if (file.size > BATAS_FOTO) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }

    setError("");
    const nilai = { file, preview: URL.createObjectURL(file) };
    if (jenis === "banner") setBanner(nilai);
    else setFotoProfil(nilai);
  }

  async function submit(event) {
    event.preventDefault();

    if (!fotoProfil || !banner) {
      setError("Foto profil dan banner toko wajib diunggah.");
      return;
    }

    setError("");
    setGagalProfil(false);
    setSedangMendaftar(true);

    try {
      await daftar(namaToko.trim(), password, whatsappNumber.trim() || null);
    } catch (galat) {
      setError(galat.message);
      setSedangMendaftar(false);
      return;
    }

    try {
      const [urlFotoProfil, urlBanner] = await Promise.all([
        unggahFotoProfil(fotoProfil.file, "avatar"),
        unggahFotoProfil(banner.file, "banner"),
      ]);

      await permintaanKelolaToko("/api/toko/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoProfil: urlFotoProfil, banner: urlBanner }),
      });

      router.replace("/kelolatoko");
    } catch (galat) {
      setGagalProfil(true);
      setError(
        `Toko berhasil dibuat, tetapi foto gagal disimpan: ${galat.message}`,
      );
    } finally {
      setSedangMendaftar(false);
    }
  }

  return (
    <div className="daftar-toko">
      <form className="daftar-toko__isi" onSubmit={submit}>
        <h1 className="daftar-toko__judul">Daftarkan Toko</h1>

        {error && (
          <p className="daftar-toko__galat" role="alert">
            {error}
          </p>
        )}

        {gagalProfil && (
          <p className="daftar-toko__lengkapi">
            <Link href="/kelolatoko/profil">
              Buka halaman Profil Toko untuk melengkapi foto
            </Link>
          </p>
        )}

        <div className="daftar-toko__bidang">
          <label className="daftar-toko__label" htmlFor="nama-toko">
            Nama Toko
          </label>
          <input
            id="nama-toko"
            className="daftar-toko__input"
            type="text"
            autoComplete="organization"
            minLength={2}
            maxLength={80}
            required
            value={namaToko}
            onChange={(event) => setNamaToko(event.target.value)}
          />
        </div>

        <div className="daftar-toko__bidang">
          <label className="daftar-toko__label" htmlFor="password-toko">
            Password Toko
          </label>
          <input
            id="password-toko"
            className="daftar-toko__input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p style={{ fontSize: "0.8rem", color: "#666" }}>
            Minimal 8 karakter.
          </p>
        </div>

        <div className="daftar-toko__bidang">
          <label className="daftar-toko__label" htmlFor="whatsapp-toko">
            Nomor WhatsApp Toko (opsional)
          </label>
          <input
            id="whatsapp-toko"
            className="daftar-toko__input"
            type="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
          />
          <p style={{ fontSize: "0.8rem", color: "#666" }}>
            Digunakan untuk notifikasi pesanan yang terverifikasi OTP.
          </p>
        </div>

        <div className="daftar-toko__bidang">
          <span className="daftar-toko__label">Foto Toko *</span>
          <div className="daftar-toko__foto">
            <div className="daftar-toko__foto-kartu">
              <span className="daftar-toko__foto-judul">Foto profil</span>
              <div className="daftar-toko__foto-preview daftar-toko__foto-preview--avatar">
                {fotoProfil ? (
                  <img src={fotoProfil.preview} alt="Pratinjau foto profil" />
                ) : (
                  <FiCamera aria-hidden="true" />
                )}
              </div>
              <label className="daftar-toko__unggah">
                <FiCamera aria-hidden="true" />
                {fotoProfil ? "Ganti foto" : "Pilih foto"}
                <input
                  type="file"
                  accept={FORMAT_FOTO.join(",")}
                  onChange={(event) => pilihFoto(event, "avatar")}
                />
              </label>
            </div>

            <div className="daftar-toko__foto-kartu daftar-toko__foto-kartu--banner">
              <span className="daftar-toko__foto-judul">Banner toko</span>
              <div className="daftar-toko__foto-preview daftar-toko__foto-preview--banner">
                {banner ? (
                  <img src={banner.preview} alt="Pratinjau banner toko" />
                ) : (
                  <FiImage aria-hidden="true" />
                )}
              </div>
              <label className="daftar-toko__unggah">
                <FiCamera aria-hidden="true" />
                {banner ? "Ganti banner" : "Pilih banner"}
                <input
                  type="file"
                  accept={FORMAT_FOTO.join(",")}
                  onChange={(event) => pilihFoto(event, "banner")}
                />
              </label>
            </div>
          </div>
          <p className="daftar-toko__petunjuk">
            Foto profil dan banner wajib diunggah. Format JPG, PNG, WebP, atau
            AVIF, maksimal 5 MB.
          </p>
        </div>

        <p className="daftar-toko__masuk">
          Sudah punya toko?{" "}
          <Link href="/masuktoko" className="daftar-toko__tautan">
            Masuk di sini
          </Link>
        </p>

        <div className="daftar-toko__aksi">
          <button
            type="submit"
            className="daftar-toko__tombol"
            disabled={sedangMendaftar || gagalProfil}
          >
            {sedangMendaftar
              ? "Mendaftarkan..."
              : gagalProfil
                ? "Toko sudah dibuat"
                : "Daftarkan toko"}
          </button>
        </div>
      </form>

      <NavigasiBawah halamanAktif="masuktoko" />
    </div>
  );
}
