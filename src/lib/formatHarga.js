export function formatHarga(angka) {
  return (
    "Rp. " +
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(angka)
  );
}
