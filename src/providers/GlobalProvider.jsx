"use client";

import { KeranjangProvider } from "@/context/KeranjangContext";
import { PesananProvider } from "@/context/PesananContext";
import { ProdukProvider } from "@/context/ProdukContext";
import { GlobalProvider as GlobalUiProvider } from "@/context/GlobalContext";
import { AuthProvider } from "@/context/AuthContext";

export default function GlobalProvider({ children }) {
  return (
    <AuthProvider>
      <GlobalUiProvider>
        <ProdukProvider>
          <KeranjangProvider>
            <PesananProvider>{children}</PesananProvider>
          </KeranjangProvider>
        </ProdukProvider>
      </GlobalUiProvider>
    </AuthProvider>
  );
}
