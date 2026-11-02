"use client";

import "./pesanan-detail.css";
import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiEdit2, FiShoppingBag } from "react-icons/fi";
import KelolaLayout from "@/components/KelolaToko/KelolaLayout";
import PopupKonfirmasi from "@/components/PopupKonfirmasi/PopupKonfirmasi";
import { useNotifikasi } from "@/components/Notifikasi/Notifikasi";
import {
  formatStatusPesanan,
  normalisasiPesananToko,
  permintaanKelolaToko,
  pesanGalat,
  ubahStatusPembayaranPesanan,
} from "@/lib/kelolaTokoClient";
import { formatHarga } from "@/lib/formatHarga";
import { formatTanggal } from "@/lib/tanggal";

const AKSI = {
  tolak: {
    judul: "Tolak pesanan?",
    pesan:
      "Status pesanan akan berubah menjadi Ditolak dan dapat dilihat pelanggan.",
    teksKonfirmasi: "Ya, tolak",
    status: "ditolak",
  },
  batalkan: {
    judul: "Batalkan pesanan?",
    pesan:
      "Status pesanan akan berubah menjadi Dibatalkan dan dapat dilihat pelanggan.",
    teksKonfirmasi: "Ya, batalkan",
    status: "dibatalkan",
  },
  selesai: {
    judul: "Tandai pesanan selesai?",
    pesan:
      "Pesanan akan dipindahkan ke riwayat toko dan tetap dihitung di analitik.",
    teksKonfirmasi: "Ya, selesaikan",
    status: "selesai",
  },
};

function gambarItem(item) {
  const gambar = Array.isArray(item.gambar) ? item.gambar[0] : item.gambar;
  return typeof gambar === "string" ? gambar : "";
}

function jumlahProduk(item) {
  return item.reduce((total, baris) => total + (Number(baris.jumlah) || 0), 0);
}

export default function DetailPesananToko() {
  return (
    <Suspense
      fallback={<main className="kelola-toko__memuat">Memuat pesanan...</main>}
    >
      <IsiDetailPesananToko />
    </Suspense>
  );
}

function IsiDetailPesananToko() {
  const { id } = useParams();
  const router = useRouter();
  const notifikasi = useNotifikasi();
  const [pesanan, setPesanan] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [memproses, setMemproses] = useState(false);
  const [aksiKonfirmasi, setAksiKonfirmasi] = useState(null);

  const ambilData = useCallback(async () => {
    if (!id) return null;
    return normalisasiPesananToko(
      await permintaanKelolaToko(
        `/api/toko/pesanan/${encodeURIComponent(id)}`,
      ),
    );
  }, [id]);

  useEffect(() => {
    let aktif = true;

    async function muatAwal() {
      try {
        const data = await ambilData();
        if (!aktif || !data) return;
        setPesanan(data);
        setGalat("");
      } catch (error) {
        if (!aktif) return;
        setPesanan(null);
        setGalat(pesanGalat(error));
      } finally {
        if (aktif) setMemuat(false);
      }
    }

    muatAwal();
    return () => {
      aktif = false;
    };
  }, [ambilData]);

  async function muatUlang({ senyap = false } = {}) {
    if (!senyap) setMemuat(true);
    try {
      const data = await ambilData();
      if (data) setPesanan(data);
      setGalat("");
    } catch (error) {
      setPesanan(null);
      setGalat(pesanGalat(error));
    } finally {
      setMemuat(false);
    }
  }

  async function ubahStatus(status) {
    if (!pesanan) return false;
    setMemproses(true);
    try {
      await permintaanKelolaToko(
        `/api/toko/pesanan/${encodeURIComponent(pesanan.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      notifikasi.sukses(
        status === "ditolak"
          ? "Pesanan ditolak."
          : status === "dibatalkan"
            ? "Pesanan dibatalkan."
            : status === "selesai"
              ? "Pesanan ditandai selesai."
              : "Pesanan diterima.",
      );
      await muatUlang({ senyap: true });
      return true;
    } catch (error) {
      notifikasi.galat(pesanGalat(error), { judul: "Gagal mengubah status" });
      return false;
    } finally {
      setMemproses(false);
    }
  }

  async function ubahPembayaran() {
    if (!pesanan) return;
    const statusPembayaran =
      pesanan.status_pembayaran === "sudah_dibayar"
        ? "belum_dibayar"
        : "sudah_dibayar";

    setMemproses(true);
    try {
      const diperbarui = await ubahStatusPembayaranPesanan(
        pesanan.id,
        statusPembayaran,
      );
      setPesanan((lama) => ({
        ...lama,
        status_pembayaran: diperbarui.status_pembayaran,
      }));
      notifikasi.sukses(
        statusPembayaran === "sudah_dibayar"
          ? "Pesanan ditandai sudah dibayar."
          : "Pesanan ditandai belum dibayar.",
      );
    } catch (error) {
      notifikasi.galat(pesanGalat(error), {
        judul: "Gagal mengubah pembayaran",
      });
    } finally {
      setMemproses(false);
    }
  }

  const konfirmasi = aksiKonfirmasi ? AKSI[aksiKonfirmasi] : null;
  const item = pesanan?.item ?? [];
  const totalJumlah = jumlahProduk(item);
  const totalHemat = item.reduce(
    (total, baris) => total + (Number(baris.diskon) || 0),
    0,
  );
  const statusPembayaran = pesanan?.status_pembayaran ?? "belum_dibayar";

  return (
    <KelolaLayout lebarPenuh>
      <main className="pesanan-detail">
        <header className="kelola-toko__bar">
          <button
            type="button"
            className="kelola-toko__bar-kembali"
            onClick={() => router.back()}
            aria-label="Kembali"
          >
            <FiArrowLeft aria-hidden="true" />
          </button>
          <h1 className="kelola-toko__bar-judul">Detail pesanan</h1>
        </header>

        {memuat && <p className="kelola-toko__kosong">Memuat pesanan...</p>}

        {!memuat && galat && (
          <div className="kelola-toko__galat" role="alert">
            <p>{galat}</p>
            <button
              type="button"
              className="kelola-toko__galat-ulang"
              onClick={() => muatUlang()}
            >
              Coba lagi
            </button>
          </div>
        )}

        {!memuat && !galat && pesanan && (
          <>
            <section className="pesanan-detail__ringkas">
              <div>
                <span className="pesanan-detail__label">ID Pesanan</span>
                <strong className="pesanan-detail__id">
                  {pesanan.idPesanan ?? "-"}
                </strong>
              </div>
              <span
                className={`pesanan-detail__status pesanan-detail__status--${pesanan.status}`}
              >
                {formatStatusPesanan(pesanan.status)}
              </span>
            </section>

            <section className="pesanan-detail__kartu">
              <h2 className="pesanan-detail__judul">Produk dipesan</h2>

              <ul className="pesanan-detail__daftar">
                {item.map((baris, index) => {
                  const gambar = gambarItem(baris);
                  const harga = Number(baris.harga) || 0;
                  const jumlah = Number(baris.jumlah) || 0;
                  const subtotal = Number.isFinite(Number(baris.subtotal))
                    ? Number(baris.subtotal)
                    : harga * jumlah;
                  const diskon = Math.max(0, Number(baris.diskon) || 0);

                  return (
                    <li
                      className="pesanan-detail__item"
                      key={`${baris.id_produk ?? "produk"}-${index}`}
                    >
                      {gambar ? (
                        <img
                          className="pesanan-detail__foto"
                          src={gambar}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="pesanan-detail__foto pesanan-detail__foto--kosong"
                          aria-hidden="true"
                        >
                          <FiShoppingBag />
                        </span>
                      )}

                      <div className="pesanan-detail__item-isi">
                        <strong className="pesanan-detail__item-nama">
                          {baris.nama}
                        </strong>
                        <p className="pesanan-detail__item-varian">
                          {[baris.varian?.rasa, baris.varian?.ukuran]
                            .filter(Boolean)
                            .join(" · ") || "Tanpa varian"}
                        </p>
                        <p className="pesanan-detail__item-jumlah">
                          {jumlah} × {formatHarga(harga)}
                        </p>
                        {baris.promo?.label && (
                          <p className="pesanan-detail__item-promo">
                            {baris.promo.label}
                          </p>
                        )}
                      </div>

                      <div className="pesanan-detail__item-harga">
                        <strong>{formatHarga(subtotal)}</strong>
                        {diskon > 0 && (
                          <small>Hemat {formatHarga(diskon)}</small>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="pesanan-detail__total">
                <span>
                  Total ({totalJumlah} produk)
                  {totalHemat > 0 && (
                    <small>Hemat {formatHarga(totalHemat)}</small>
                  )}
                </span>
                <strong>{formatHarga(Number(pesanan.total) || 0)}</strong>
              </div>
            </section>

            <section className="pesanan-detail__kartu">
              <h2 className="pesanan-detail__judul">Data pesanan</h2>
              <dl className="pesanan-detail__data">
                <div>
                  <dt>Nama Pemesan</dt>
                  <dd>{pesanan.namaPenerima || "-"}</dd>
                </div>
                <div>
                  <dt>Nomor Pemesan</dt>
                  <dd>
                    {pesanan.nomorPemesan ? (
                      <a
                        href={`https://wa.me/${pesanan.nomorPemesan}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {pesanan.nomorPemesan}
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Kode Klaim</dt>
                  <dd className="pesanan-detail__kode">
                    {pesanan.kodeKlaim || "-"}
                  </dd>
                </div>
                <div>
                  <dt>Tanggal</dt>
                  <dd>
                    {formatTanggal(pesanan.created_at ?? pesanan.createdAt, {
                      denganHari: true,
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Pembayaran</dt>
                  <dd>
                    {totalJumlah > 3 ? (
                      <button
                        type="button"
                        className={`kelola-toko__order-status-bayar kelola-toko__order-status-bayar--${statusPembayaran}`}
                        disabled={memproses}
                        onClick={ubahPembayaran}
                        aria-label={`Ubah status pembayaran, saat ini ${
                          statusPembayaran === "sudah_dibayar"
                            ? "sudah dibayar"
                            : "belum bayar"
                        }`}
                      >
                        {statusPembayaran === "sudah_dibayar"
                          ? "Sudah dibayar"
                          : "Belum bayar"}
                        <FiEdit2 aria-hidden="true" />
                      </button>
                    ) : (
                      <span
                        className={`kelola-toko__order-status-bayar kelola-toko__order-status-bayar--${statusPembayaran}`}
                      >
                        {statusPembayaran === "sudah_dibayar"
                          ? "Sudah dibayar"
                          : "Belum bayar"}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="pesanan-detail__aksi">
              {pesanan.status === "menunggu_konfirmasi" && (
                <>
                  <button
                    type="button"
                    className="kelola-toko__terima"
                    disabled={memproses}
                    onClick={() => ubahStatus("diproses")}
                  >
                    {memproses ? "Menyimpan..." : "Terima"}
                  </button>
                  <button
                    type="button"
                    className="kelola-toko__terima kelola-toko__terima--sekunder"
                    disabled={memproses}
                    onClick={() => setAksiKonfirmasi("tolak")}
                  >
                    Tolak
                  </button>
                </>
              )}

              {pesanan.status === "diproses" && (
                <>
                  <button
                    type="button"
                    className="kelola-toko__terima kelola-toko__selesaikan"
                    disabled={memproses}
                    onClick={() => setAksiKonfirmasi("selesai")}
                  >
                    {memproses ? "Menyimpan..." : "Selesai"}
                  </button>
                  <button
                    type="button"
                    className="kelola-toko__terima kelola-toko__terima--sekunder"
                    disabled={memproses}
                    onClick={() => setAksiKonfirmasi("batalkan")}
                  >
                    Batalkan
                  </button>
                </>
              )}
            </div>

            <p className="pesanan-detail__tautan">
              <Link href="/kelolatoko/pesanan">Lihat semua permintaan</Link>
            </p>
          </>
        )}
      </main>

      <PopupKonfirmasi
        buka={Boolean(konfirmasi)}
        judul={konfirmasi?.judul}
        pesan={konfirmasi?.pesan}
        teksKonfirmasi={konfirmasi?.teksKonfirmasi}
        memproses={memproses}
        onKonfirmasi={async () => {
          if (!konfirmasi) return;
          const berhasil = await ubahStatus(konfirmasi.status);
          if (berhasil) setAksiKonfirmasi(null);
        }}
        onBatal={() => setAksiKonfirmasi(null)}
      />
    </KelolaLayout>
  );
}
