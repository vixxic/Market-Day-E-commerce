"use client";

import { KeranjangProvider } from "@/Context/KeranjangContext";
import { PesananProvider } from "@/Context/PesananContext";
import { ProdukProvider } from "@/Context/ProdukContext";
import { GlobalProvider as GlobalUiProvider } from "@/Context/GlobalContext";
import { AuthProvider } from "@/Context/AuthContext";
import { NotifikasiProvider } from "@/components/Notifikasi/Notifikasi";
import NavigasiAtas from "@/components/NavigasiAtas/NavigasiAtas";
import SmoothScroll from "@/components/SmoothScroll/SmoothScroll";

export default function GlobalProvider({ children }) {
  return (
    <NotifikasiProvider>
      <AuthProvider>
        <GlobalUiProvider>
          <ProdukProvider>
            <KeranjangProvider>
              <PesananProvider>
                <SmoothScroll />
                <NavigasiAtas />
                <div className="konten-situs">{children}</div>
              </PesananProvider>
            </KeranjangProvider>
          </ProdukProvider>
        </GlobalUiProvider>
      </AuthProvider>
    </NotifikasiProvider>
  );
}
