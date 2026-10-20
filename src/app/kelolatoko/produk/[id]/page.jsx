import PesananPerProduk from "@/components/KelolaToko/PesananPerProduk";
import { Suspense } from "react";

async function IsiPesananPerProduk({ params }) {
  const { id } = await params;
  return <PesananPerProduk id={id} />;
}

export default function PesananPerProdukPage({ params }) {
  return (
    <Suspense fallback={<p>Memuat pesanan produk...</p>}>
      <IsiPesananPerProduk params={params} />
    </Suspense>
  );
}
