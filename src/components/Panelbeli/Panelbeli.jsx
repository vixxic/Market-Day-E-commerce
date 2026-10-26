"use client";

import "./Panelbeli.css";
import { useEffect, useId, useRef, useState } from "react";

const UKURAN_BAWAAN = ["Small", "Medium", "Large"];
const KUNCI_TUNGGAL = "__produk__"; // dipakai kalau produk tidak punya "rasa"
const JUMLAH_MAKS = 99;

function ambilUkuranAwal(daftarUkuran) {
  // Pilih yang di tengah (untuk Small/Medium/Large -> Medium)
  return daftarUkuran[Math.floor((daftarUkuran.length - 1) / 2)];
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
 *                      "ukuran" -> array teks (default Small, Medium, Large)
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
  const daftarJenis = produk.rasa?.length ? produk.rasa : null;
  const daftarUkuran = produk.ukuran?.length ? produk.ukuran : UKURAN_BAWAAN;
  const ukuranAwal = ambilUkuranAwal(daftarUkuran);
  const daftarKunci = daftarJenis ?? [KUNCI_TUNGGAL];

  // pesanan = { [jenis]: { [ukuran]: jumlah } }
  // - tanpa rasa / satu rasa: jenis dan ukuran tengah aktif secara default
  // - lebih dari satu rasa: pembeli mengaktifkan jenis dan ukuran sendiri
  const [pesanan, setPesanan] = useState(() => {
    const awal = { [ukuranAwal]: 1 };
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
        const { [jenis]: _dihapus, ...sisa } = lama;
        return sisa;
      }
      return { ...lama, [jenis]: {} };
    });
  }

  function pilihUkuran(kunci, ukuran) {
    setPesanan((lama) => {
      const ukuranTerpilih = lama[kunci] ?? {};
      if (ukuran in ukuranTerpilih) {
        const { [ukuran]: _dihapus, ...sisaUkuran } = ukuranTerpilih;
        return { ...lama, [kunci]: sisaUkuran };
      }
      return {
        ...lama,
        [kunci]: { ...ukuranTerpilih, [ukuran]: 1 },
      };
    });
  }

  function ubahJumlah(kunci, ukuran, selisih) {
    setPesanan((lama) => {
      if (selisih < 0 && lama[kunci][ukuran] <= 1) {
        const { [ukuran]: _dihapus, ...sisaUkuran } = lama[kunci];
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

  const kunciTerpilih = daftarKunci.filter((k) => pesanan[k]);
  const adaPesanan = kunciTerpilih.some(
    (kunci) => Object.keys(pesanan[kunci]).length > 0,
  );

  function susunPesanan() {
    return kunciTerpilih.flatMap((kunci) =>
      Object.entries(pesanan[kunci]).map(([ukuran, jumlah]) => ({
        idProduk: produk.id,
        id_toko: produk.id_toko,
        nama: produk.nama,
        harga: produk.harga,
        gambar: Array.isArray(produk.image) 
          ? produk.image[0] 
          : (produk.gambar ?? produk.image ?? null),
        jenis: daftarJenis ? kunci : null,
        ukuran,
        jumlah,
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
                        daftarJenis.length === 1 ? "true" : undefined
                      }
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

                <div className="panel-beli__baris">
                  <span className="panel-beli__label">Pilih ukuran:</span>
                  <div
                    className="panel-beli__ukuran"
                    role="group"
                    aria-label={`Ukuran ${label}`}
                  >
                    {daftarUkuran.map((u) => (
                      <button
                        key={u}
                        type="button"
                        aria-pressed={u in ukuranTerpilih}
                        className={
                          "panel-beli__ukuran-pil" +
                          (u in ukuranTerpilih
                            ? " panel-beli__ukuran-pil--aktif"
                            : "")
                        }
                        onClick={() => pilihUkuran(kunci, u)}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                {Object.entries(ukuranTerpilih).map(([ukuran, jumlah]) => (
                  <div className="panel-beli__baris" key={ukuran}>
                    <span className="panel-beli__label">
                      Jumlah ukuran {ukuran}:
                    </span>
                    <div className="panel-beli__jumlah">
                      <button
                        type="button"
                        className="panel-beli__tombol-jumlah"
                        aria-label={`Tambah jumlah ${label} ukuran ${ukuran}`}
                        disabled={jumlah >= JUMLAH_MAKS}
                        onClick={() => ubahJumlah(kunci, ukuran, 1)}
                      >
                        +
                      </button>
                      <output className="panel-beli__angka" aria-live="polite">
                        {jumlah}
                      </output>
                      <button
                        type="button"
                        className="panel-beli__tombol-jumlah"
                        aria-label={`Kurangi jumlah ${label} ukuran ${ukuran}`}
                        onClick={() => ubahJumlah(kunci, ukuran, -1)}
                      >
                        −
                      </button>
                    </div>
                  </div>
                ))}

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
            disabled={!adaPesanan}
            onClick={() => onPesan?.(susunPesanan())}
          >
            Pesan
          </button>
          <button
            type="button"
            className="panel-beli__tombol panel-beli__tombol--keranjang"
            disabled={!adaPesanan}
            onClick={() => onMasukKeranjang?.(susunPesanan())}
          >
            Masuk Keranjang
          </button>
        </div>
      </div>
    </div>
  );
}
