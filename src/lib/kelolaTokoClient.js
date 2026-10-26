export async function permintaanKelolaToko(url, options) {
  const respons = await fetch(url, options);
  const data = respons.status === 204 ? null : await respons.json();
  if (!respons.ok) {
    throw new Error(data?.error ?? "Permintaan gagal. Coba lagi.");
  }
  return data;
}

export function gambarProduk(produk) {
  const gambar = produk.image ?? produk.gambar;
  if (Array.isArray(gambar)) return gambar[0] ?? "";
  return typeof gambar === "string" ? gambar : "";
}

export function normalisasiPesananToko(pesanan) {
  const sumberItem = Array.isArray(pesanan.items)
    ? pesanan.items
    : Array.isArray(pesanan.item)
      ? pesanan.item
      : [];
  const item = sumberItem.map((produk) => {
    const varian = produk.varian ?? {};
    const jumlah = produk.jumlah ?? 1;
    const harga = Number(produk.harga ?? 0);

    return {
      ...produk,
      id_produk: produk.id_produk ?? produk.idProduk,
      nama: produk.nama ?? produk.name ?? "Produk",
      harga,
      gambar: produk.gambar ?? produk.image ?? null,
      jumlah,
      subtotal: produk.subtotal ?? harga * Number(jumlah),
      varian: {
        ...varian,
        rasa: varian.rasa ?? produk.jenis ?? null,
        ukuran: varian.ukuran ?? produk.ukuran ?? "",
      },
    };
  });

  return {
    ...pesanan,
    idPesanan: pesanan.id_pesanan ?? pesanan.idPesanan ?? pesanan.id,
    kodeKlaim: pesanan.kode_klaim ?? pesanan.kodeKlaim,
    namaPenerima: pesanan.nama_penerima ?? pesanan.namaPenerima,
    nomorPemesan: pesanan.nomor_pemesan ?? pesanan.nomorPemesan,
    item,
  };
}

export function formatStatusPesanan(status) {
  const label = {
    menunggu_konfirmasi: "Permintaan",
    diproses: "Diterima",
    selesai: "Selesai",
    ditolak: "Ditolak",
  };
  return label[status] ?? status;
}
