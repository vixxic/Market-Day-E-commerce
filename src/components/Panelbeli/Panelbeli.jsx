"use client";

import "./Panelbeli.css";
import { useEffect, useId, useRef, useState } from "react";
import { formatHarga } from "@/lib/formatHarga";
import {
  hargaUntukUkuran,
  normalisasiUkuran,
} from "@/lib/ukuranProduk";
import {
  adaPromo,
  hitungPromo,
  labelPromo,
  normalisasiPromo,
} from "@/lib/promoProduk";

const KUNCI_TUNGGAL = "__produk__"; // dipakai kalau produk tidak punya "rasa"
const JUMLAH_MAKS = 99;

function normalisasiPilihan(nilai) {
  const pilihan = Array.isArray(nilai)
    ? nilai
    : typeof nilai === "string"
      ? nilai.split(",")
      : [];

  return [
    ...new Set(
      pilihan
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function ambilUkuranAwal(daftarUkuran) {
  // Default pilih opsi tengah dari daftar ukuran yang diisi penjual.
  return daftarUkuran[Math.floor((daftarUkuran.length - 1) / 2)];
}

function jumlahPesanan(pesanan) {
  return Object.values(pesanan).reduce(
    (total, ukuran) =>
      total +
      Object.values(ukuran).reduce((jumlah, nilai) => jumlah + nilai, 0),
    0,
  );
}

/**
 * Panel yang naik dari bawah saat tombol "Beli" ditekan.
 *
 * Props:
 * - terbuka          : true/false
 * - onTutup          : dipanggil saat latar gelap / tombol Escape ditekan
 * - produk           : objek produk dari API. Field opsional:
 *                      "rasa"   -> array teks, contoh ["Cokelat", "Matcha"]
 *                                  (ditampilkan sebagai "Jenis Produk")
 *                      "ukuran" -> array teks yang diisi penjual
 * - onPesan          : dipanggil dengan array pesanan
 * - onMasukKeranjang : dipanggil dengan array pesanan
 *
 * Bentuk satu pesanan:
 * { idProduk, nama, harga, gambar, jenis (atau null), ukuran, jumlah }
 */
export default function PanelBeli({
  terbuka,
  onTutup,
  produk,
  onPesan,
  onMasukKeranjang,
}) {
  const idJudul = useId();
  const lembarRef = useRef(null);

  // "rasa" di API ditampilkan sebagai "Jenis Produk"
  const jenisProduk = normalisasiPilihan(produk.rasa);
  const daftarJenis = jenisProduk.length > 0 ? jenisProduk : null;
  const daftarUkuran = normalisasiUkuran(produk.ukuran, produk.harga);
  const daftarNamaUkuran = daftarUkuran.map((item) => item.nama);
  const ukuranAwal =
    daftarNamaUkuran.length > 0 ? ambilUkuranAwal(daftarNamaUkuran) : "";
  const daftarKunci = daftarJenis ?? [KUNCI_TUNGGAL];
  const stok = Number.isSafeInteger(Number(produk.stok))
    ? Math.max(0, Number(produk.stok))
    : 0;
  const promo = normalisasiPromo(produk.promo);
  const promoAktif = adaPromo(promo);

  // pesanan = { [jenis]: { [ukuran]: jumlah } }
  // Tanpa variasi jenis, opsi produk langsung siap dipesan.
  const [pesanan, setPesanan] = useState(() => {
    const awal = {
      [daftarUkuran.length > 0 ? ukuranAwal : ""]: Math.min(1, stok),
    };
    if (!daftarJenis) return { [KUNCI_TUNGGAL]: awal };
    if (daftarJenis.length === 1) return { [daftarJenis[0]]: awal };
    return {};
  });

  // Escape menutup panel, layar belakang tidak bisa di-scroll, fokus pindah ke panel
  useEffect(() => {
    if (!terbuka) return;

    const saatTombol = (e) => e.key === "Escape" && onTutup?.();
    document.addEventListener("keydown", saatTombol);

    const overflowAwal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lembarRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", saatTombol);
      document.body.style.overflow = overflowAwal;
    };
  }, [terbuka, onTutup]);

  function pilihJenis(jenis) {
    setPesanan((lama) => {
      if (jenis in lama) {
        if (daftarJenis.length === 1) return lama;
        const { [jenis]: _dihapus, ...sisa } = lama;
        return sisa;
      }
      if (jumlahPesanan(lama) >= stok) return lama;
      return {
        ...lama,
        [jenis]: {
          [daftarUkuran.length > 0 ? ukuranAwal : ""]: Math.min(
            1,
            stok - jumlahPesanan(lama),
          ),
        },
      };
    });
  }

  function pilihUkuran(kunci, ukuran) {
    setPesanan((lama) => {
      const ukuranTerpilih = lama[kunci] ?? {};
      if (ukuran in ukuranTerpilih) {
        const { [ukuran]: _dihapus, ...sisaUkuran } = ukuranTerpilih;
        if (Object.keys(sisaUkuran).length === 0) {
          const { [kunci]: _kartuDihapus, ...sisaKartu } = lama;
          return sisaKartu;
        }
        return { ...lama, [kunci]: sisaUkuran };
      }
      if (jumlahPesanan(lama) >= stok) return lama;
      return {
        ...lama,
        [kunci]: {
          ...ukuranTerpilih,
          [ukuran]: Math.min(1, stok - jumlahPesanan(lama)),
        },
      };
    });
  }

  function ubahJumlah(kunci, ukuran, selisih) {
    setPesanan((lama) => {
      if (selisih > 0 && jumlahPesanan(lama) >= stok) return lama;
      if (selisih < 0 && lama[kunci][ukuran] <= 1) {
        const { [ukuran]: _dihapus, ...sisaUkuran } = lama[kunci];
        // Jangan sisakan kartu kosong saat jumlah turun ke 0.
        if (Object.keys(sisaUkuran).length === 0) {
          const { [kunci]: _kartuDihapus, ...sisaKartu } = lama;
          return sisaKartu;
        }
        return { ...lama, [kunci]: sisaUkuran };
      }

      const baru = Math.min(
        JUMLAH_MAKS,
        Math.max(1, lama[kunci][ukuran] + selisih),
      );
      return {
        ...lama,
        [kunci]: { ...lama[kunci], [ukuran]: baru },
      };
    });
  }

  const kunciTerpilih = daftarKunci.filter(
    (k) =>
      pesanan[k] &&
      Object.values(pesanan[k]).some((jumlah) => jumlah > 0),
  );
  const adaPesanan = kunciTerpilih.some(
    (kunci) => Object.keys(pesanan[kunci]).length > 0,
  );

  function susunPesanan() {
    return kunciTerpilih.flatMap((kunci) =>
      Object.entries(pesanan[kunci]).map(([ukuran, jumlah]) => ({
        idProduk: produk.id,
        id_toko: produk.id_toko,
        nama: produk.nama,
        harga: hargaUntukUkuran(daftarUkuran, ukuran, produk.harga),
        gambar: Array.isArray(produk.image) 
          ? produk.image[0] 
          : (produk.gambar ?? produk.image ?? null),
        jenis: daftarJenis ? kunci : null,
        ukuran,
        jumlah,
        promo: promo ?? null,
      })),
    );
  }

  return (
    <div className={"panel-beli" + (terbuka ? " panel-beli--terbuka" : "")}>
      <div className="panel-beli__latar" onClick={onTutup} aria-hidden="true" />

      <div
        ref={lembarRef}
        className="panel-beli__lembar"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        tabIndex={-1}
      >
        <div className="panel-beli__pegangan" aria-hidden="true" />

        <div className="panel-beli__isi">
          <h2 id={idJudul} className="panel-beli__judul">
            {daftarJenis ? "Jenis Produk" : "Atur Pesanan"}
          </h2>
          <p
            className={
              "panel-beli__stok" +
              (stok === 0 ? " panel-beli__stok--habis" : "")
            }
            role="status"
          >
            {stok > 0 ? `Stok tersedia: ${stok}` : "Stok produk habis"}
          </p>

          {daftarJenis && (
            <>
              <div
                className="panel-beli__pilihan-jenis"
                role="group"
                aria-label="Pilih jenis produk"
              >
                {daftarJenis.map((jenis) => {
                  const dipilih = Boolean(pesanan[jenis]);
                  return (
                    <button
                      key={jenis}
                      type="button"
                      className={
                        "panel-beli__chip" +
                        (dipilih ? " panel-beli__chip--aktif" : "")
                      }
                      aria-pressed={dipilih}
                      aria-disabled={
                        daftarJenis.length === 1 ||
                        (!dipilih && jumlahPesanan(pesanan) >= stok)
                          ? "true"
                          : undefined
                      }
                      disabled={!dipilih && jumlahPesanan(pesanan) >= stok}
                      onClick={() => pilihJenis(jenis)}
                    >
                      {jenis}
                    </button>
                  );
                })}
              </div>

              {!adaPesanan && (
                <p className="panel-beli__petunjuk">
                  Pilih jenis produk terlebih dahulu.
                </p>
              )}
            </>
          )}

          {kunciTerpilih.map((kunci) => {
            const label = daftarJenis ? kunci : produk.nama;
            const ukuranTerpilih = pesanan[kunci];

            return (
              <section className="panel-beli__kartu" key={kunci}>
                <p className="panel-beli__kartu-judul">
                  {daftarJenis ? `Jenis Produk: ${label}` : label}
                </p>

                {promoAktif && (
                  <p className="panel-beli__promo">{labelPromo(promo)}</p>
                )}

                {daftarUkuran.length > 0 && (
                  <div className="panel-beli__baris">
                    <span className="panel-beli__label">Pilih ukuran:</span>
                    <div
                      className="panel-beli__ukuran"
                      role="group"
                      aria-label={`Ukuran ${label}`}
                    >
                      {daftarUkuran.map((u) => {
                        const dipilih = u.nama in ukuranTerpilih;
                        const terkunci =
                          daftarUkuran.length === 1 ||
                          (!dipilih && jumlahPesanan(pesanan) >= stok);

                        return (
                          <button
                            key={u.nama}
                            type="button"
                            aria-pressed={dipilih}
                            aria-disabled={terkunci}
                            disabled={terkunci}
                            className={
                              "panel-beli__ukuran-pil" +
                              (dipilih
                                ? " panel-beli__ukuran-pil--aktif"
                                : "")
                            }
                            onClick={() => pilihUkuran(kunci, u.nama)}
                          >
                            <span className="panel-beli__ukuran-nama">
                              {u.nama}
                            </span>
                            <span className="panel-beli__ukuran-harga">
                              {formatHarga(u.harga)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {Object.entries(ukuranTerpilih).map(([ukuran, jumlah]) => {
                  const hargaSatuan = hargaUntukUkuran(
                    daftarUkuran,
                    ukuran,
                    produk.harga,
                  );
                  const hitungan = hitungPromo(promo, hargaSatuan, jumlah);

                  return (
                    <div className="panel-beli__baris-grup" key={ukuran}>
                      <div className="panel-beli__baris">
                        <span className="panel-beli__label">
                          {ukuran ? `Jumlah ukuran ${ukuran}:` : "Jumlah:"}
                          <small className="panel-beli__harga-satuan">
                            {formatHarga(hargaSatuan)} / item
                          </small>
                        </span>
                        <div className="panel-beli__jumlah">
                          <button
                            type="button"
                            className="panel-beli__tombol-jumlah"
                            aria-label={`Kurangi jumlah ${label} ukuran ${ukuran}`}
                            onClick={() => ubahJumlah(kunci, ukuran, -1)}
                          >
                            −
                          </button>
                          <output
                            className="panel-beli__angka"
                            aria-live="polite"
                          >
                            {jumlah}
                          </output>
                          <button
                            type="button"
                            className="panel-beli__tombol-jumlah"
                            aria-label={`Tambah jumlah ${label} ukuran ${ukuran}`}
                            disabled={
                              jumlah >= JUMLAH_MAKS ||
                              jumlahPesanan(pesanan) >= stok
                            }
                            onClick={() => ubahJumlah(kunci, ukuran, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {hitungan.diskon > 0 && (
                        <p className="panel-beli__baris-total">
                          <span>
                            Total {formatHarga(hitungan.subtotal)}
                          </span>
                          <span className="panel-beli__hemat">
                            Hemat {formatHarga(hitungan.diskon)}
                            {hitungan.gratis > 0
                              ? ` (${hitungan.gratis} gratis)`
                              : ""}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}

                {Object.keys(ukuranTerpilih).length === 0 && (
                  <p className="panel-beli__petunjuk">
                    Pilih satu atau beberapa ukuran untuk jenis ini.
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <div className="panel-beli__aksi">
          <button
            type="button"
            className="panel-beli__tombol panel-beli__tombol--pesan"
            disabled={!adaPesanan || stok === 0}
            onClick={() => onPesan?.(susunPesanan())}
          >
            Pesan
          </button>
          <button
            type="button"
            className="panel-beli__tombol panel-beli__tombol--keranjang"
            disabled={!adaPesanan || stok === 0}
            onClick={() => onMasukKeranjang?.(susunPesanan())}
          >
            Masuk Keranjang
          </button>
        </div>
      </div>
    </div>
  );
}
