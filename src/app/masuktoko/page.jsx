"use client";

import "./masuktoko.css";
import { useState } from "react";
import Link from "next/link";

import NavigasiBawah from "../Components/NavigasiBawah/NavigasiBawah";

export default function MasukToko() {
  const [namaToko, setNamaToko] = useState("");
  const [password, setPassword] = useState("");
  const [galat, setGalat] = useState({});
  const [sedangMasuk, setSedangMasuk] = useState(false);

  async function masuk(e) {
    e.preventDefault();

    const galatBaru = {};
    if (!namaToko.trim()) galatBaru.namaToko = "Isi nama toko.";
    if (!password) galatBaru.password = "Isi password toko.";
    setGalat(galatBaru);
    if (Object.keys(galatBaru).length > 0) return;

    setSedangMasuk(true);
    try {
      // TODO: proses login toko di sini (cek nama toko & password ke API milikmu),
      // lalu arahkan ke halaman toko, contoh: router.push("/toko")
      console.log("Masuk sebagai toko:", namaToko.trim());
    } finally {
      setSedangMasuk(false);
    }
  }

  return (
    <div className="masuk-toko">
      <form className="masuk-toko__isi" onSubmit={masuk} noValidate>
        <h1 className="masuk-toko__judul">Masuk ke Toko</h1>

        <div className="masuk-toko__bidang">
          <label className="masuk-toko__label" htmlFor="nama-toko">
            Nama Toko
          </label>
          <input
            id="nama-toko"
            className="masuk-toko__input"
            type="text"
            autoComplete="username"
            value={namaToko}
            onChange={(e) => setNamaToko(e.target.value)}
            aria-invalid={galat.namaToko ? "true" : undefined}
            aria-describedby={galat.namaToko ? "galat-nama-toko" : undefined}
          />
          {galat.namaToko && (
            <p id="galat-nama-toko" className="masuk-toko__galat" role="alert">
              {galat.namaToko}
            </p>
          )}
        </div>

        <div className="masuk-toko__bidang">
          <label className="masuk-toko__label" htmlFor="password-toko">
            Password Toko
          </label>
          <input
            id="password-toko"
            className="masuk-toko__input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={galat.password ? "true" : undefined}
            aria-describedby={galat.password ? "galat-password" : undefined}
          />
          {galat.password && (
            <p id="galat-password" className="masuk-toko__galat" role="alert">
              {galat.password}
            </p>
          )}
        </div>

        <p className="masuk-toko__daftar">
          Belum mendaftarkan toko?{" "}
          {/* TODO: sesuaikan alamat halaman pendaftaran toko */}
          <Link href="/daftar-toko" className="masuk-toko__tautan">
            Daftar di sini
          </Link>
        </p>

        <div className="masuk-toko__aksi">
          <button
            type="submit"
            className="masuk-toko__tombol"
            disabled={sedangMasuk}
          >
            {sedangMasuk ? "Memproses..." : "Masuk"}
          </button>
        </div>
      </form>

      <NavigasiBawah halamanAktif="masuktoko" />
    </div>
  );
}
