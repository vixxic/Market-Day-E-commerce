import { Inter } from "next/font/google";
import "./globals.css";

import GlobalProvider from "@/providers/GlobalProvider";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

function urlSitus() {
  const kandidat =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);

  try {
    return new URL(kandidat ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata = {
  metadataBase: urlSitus(),
  title: "Market Day",
  description:
    "Market Day Sekolah Tri Ratna Jakarta: belanja jajanan dan produk siswa langsung dari toko sekolah.",
  applicationName: "Market Day",
  icons: {
    icon: [{ url: "/TR.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/TR.png",
    apple: [{ url: "/TR.png", type: "image/png", sizes: "512x512" }],
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Market Day",
    title: "Market Day",
    description:
      "Belanja jajanan dan produk siswa Sekolah Tri Ratna Jakarta langsung dari toko sekolah.",
    images: [
      {
        url: "/banner-market-day.jpg",
        width: 1200,
        height: 600,
        alt: "Banner Market Day Sekolah Tri Ratna Jakarta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Day",
    description:
      "Belanja jajanan dan produk siswa Sekolah Tri Ratna Jakarta langsung dari toko sekolah.",
    images: ["/banner-market-day.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <GlobalProvider>{children}</GlobalProvider>
      </body>
    </html>
  );
}
