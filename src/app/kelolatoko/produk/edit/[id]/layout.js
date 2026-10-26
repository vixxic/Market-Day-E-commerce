import { Suspense } from "react";

export default function EditProdukLayout({ children }) {
  return (
    <Suspense fallback={<main className="kelola-toko__memuat">Memuat...</main>}>
      {children}
    </Suspense>
  );
}
