"use client";

import { KeranjangProvider } from "@/Context/KeranjangContext";
import { PesananProvider } from "@/Context/PesananContext";
import { ProdukProvider } from "@/Context/ProdukContext";
import { GlobalProvider as GlobalUiProvider } from "@/Context/GlobalContext";
import { AuthProvider } from "@/Context/AuthContext";
import NavigasiAtas from "@/components/NavigasiAtas/NavigasiAtas";

export default function GlobalProvider({ children }) {
  return (
    <AuthProvider>
      <GlobalUiProvider>
        <ProdukProvider>
          <KeranjangProvider>
            <PesananProvider>
              <NavigasiAtas />
              {children}
            </PesananProvider>
          </KeranjangProvider>
        </ProdukProvider>
      </GlobalUiProvider>
    </AuthProvider>
  );
}
