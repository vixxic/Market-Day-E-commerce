"use client";

import NavigasiBawah from "./Components/NavigasiBawah/NavigasiBawah";

// context
import { useGlobalContext } from "@/Context/GlobalContext";

// pages
import Beranda from "./beranda/page";

export default function Home() {
  const { pages } = useGlobalContext();

  return (
    <div>
      <main>{pages == "beranda" ? <Beranda /> : ""}</main>
      <NavigasiBawah />
    </div>
  );
}
