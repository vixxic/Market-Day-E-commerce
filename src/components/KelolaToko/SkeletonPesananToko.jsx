"use client";

function Blok({ className, style }) {
  return (
    <span
      className={"kelola-skel" + (className ? ` ${className}` : "")}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Kerangka kartu pesanan. Bentuknya mengikuti KartuPesananToko supaya tidak
 * ada lompatan tata letak saat data selesai dimuat.
 */
export function SkeletonPesanan({ jumlah = 3, tombol = true }) {
  return (
    <div className="kelola-toko__order-list" aria-hidden="true">
      {Array.from({ length: jumlah }, (_, posisi) => (
        <article className="kelola-skel-kartu" key={posisi}>
          <Blok className="kelola-skel--foto" />
          <div className="kelola-skel-kartu__isi">
            <Blok
              className="kelola-skel--judul"
              style={{ width: `${72 - posisi * 7}%` }}
            />
            <Blok className="kelola-skel--harga" />
            <Blok className="kelola-skel--tombol" />
          </div>
          {tombol && <Blok className="kelola-skel--aksi" />}
        </article>
      ))}
    </div>
  );
}

export function SkeletonRingkasanRiwayat() {
  return (
    <div className="riwayat__ringkasan" aria-hidden="true">
      {[0, 1, 2].map((posisi) => (
        <span className="riwayat__ringkasan-item" key={posisi}>
          <Blok className="kelola-skel--label" />
          <Blok className="kelola-skel--nilai" />
        </span>
      ))}
    </div>
  );
}
