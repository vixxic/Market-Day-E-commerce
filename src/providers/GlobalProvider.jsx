"use client";

import { KeranjangProvider } from "@/Context/KeranjangContext";
import { PesananProvider } from "@/Context/PesananContext";
import { ProdukProvider } from "@/Context/ProdukContext";
import { GlobalProvider as GlobalUiProvider } from "@/Context/GlobalContext";
import { AuthProvider } from "@/Context/AuthContext";
import NavigasiAtas from "@/components/NavigasiAtas/NavigasiAtas";
import SmoothScroll from "@/components/SmoothScroll/SmoothScroll";

export default function GlobalProvider({ children }) {
  return (
    <AuthProvider>
      <GlobalUiProvider>
        <ProdukProvider>
          <KeranjangProvider>
            <PesananProvider>
              <SmoothScroll />
              <NavigasiAtas />
              {children}
            </PesananProvider>
          </KeranjangProvider>
        </ProdukProvider>
      </GlobalUiProvider>
    </AuthProvider>
  );
}
