// "use client";

// import "./daftar-toko.css";
// import { useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useAuthContext } from "@/context/AuthContext";

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
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
// Sesuaikan path import ini dengan yang dipakai di halaman masuk toko
import NavigasiBawah from "@/components/NavigasiBawah/NavigasiBawah";

export default function DaftarTokoPage() {
  const { daftar } = useAuthContext();
  const router = useRouter();
  const [namaToko, setNamaToko] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sedangMendaftar, setSedangMendaftar] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSedangMendaftar(true);
    try {
      await daftar(namaToko.trim(), password);
      router.replace("/kelolatoko");
    } catch (galat) {
      setError(galat.message);
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
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
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
            disabled={sedangMendaftar}
          >
            {sedangMendaftar ? "Mendaftarkan..." : "Daftarkan toko"}
          </button>
        </div>
      </form>

      <NavigasiBawah halamanAktif="masuktoko" />
    </div>
  );
}
