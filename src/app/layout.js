import { Inter } from "next/font/google";
import "./globals.css";

import GlobalProvider from "@/providers/GlobalProvider";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Market Day",
  description: "E-commerce untuk market day",
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
