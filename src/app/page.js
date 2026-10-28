"use client";

import NavigasiBawah from "@/components/NavigasiBawah/NavigasiBawah";

// pages
import Beranda from "./beranda/page";

export default function Home() {
  return (
    <div>
      <main>
        <Beranda />
      </main>
      <NavigasiBawah />
    </div>
  );
}
