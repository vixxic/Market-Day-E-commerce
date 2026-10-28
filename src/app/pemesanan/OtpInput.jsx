"use client";

import { useEffect, useRef } from "react";

const JUMLAH_DIGIT = 6;

export default function OtpInput({ nilai = "", onUbah, nonaktif = false }) {
  const refInput = useRef([]);
  const digit = Array.from(
    { length: JUMLAH_DIGIT },
    (_, index) => nilai[index] ?? "",
  );

  useEffect(() => {
    refInput.current[0]?.focus();
  }, []);

  function fokusKe(index) {
    const posisi = Math.min(Math.max(index, 0), JUMLAH_DIGIT - 1);
    const input = refInput.current[posisi];
    input?.focus();
    input?.select();
  }

  function tulisMulai(index, teks) {
    const angka = teks.replace(/\D/g, "");
    if (!angka) return;

    const baru = digit.slice();
    let posisi = index;
    for (const huruf of angka) {
      if (posisi >= JUMLAH_DIGIT) break;
      baru[posisi] = huruf;
      posisi += 1;
    }

    onUbah(baru.join(""));
    fokusKe(posisi);
  }

  function saatBerubah(index, event) {
    const angka = event.target.value.replace(/\D/g, "");

    if (!angka) {
      const baru = digit.slice();
      baru[index] = "";
      onUbah(baru.join(""));
      return;
    }

    tulisMulai(index, angka);
  }

  function saatTekan(index, event) {
    if (/^\d$/.test(event.key) && digit[index]) {
      event.preventDefault();
      tulisMulai(index, event.key);
      return;
    }

    if (event.key === "Backspace") {
      if (digit[index] || index === 0) return;
      event.preventDefault();
      const baru = digit.slice();
      baru[index - 1] = "";
      onUbah(baru.join(""));
      fokusKe(index - 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      fokusKe(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      fokusKe(index + 1);
    }
  }

  function saatTempel(index, event) {
    const teks = event.clipboardData?.getData("text") ?? "";
    if (!/\d/.test(teks)) return;

    event.preventDefault();
    const angka = teks.replace(/\D/g, "");
    tulisMulai(angka.length >= JUMLAH_DIGIT ? 0 : index, angka);
  }

  return (
    <div className="pemesanan__otp-kotak">
      {digit.map((isi, index) => (
        <input
          key={index}
          ref={(elemen) => {
            refInput.current[index] = elemen;
          }}
          className={`pemesanan__otp-input${
            isi ? " pemesanan__otp-input--terisi" : ""
          }`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={isi}
          onChange={(event) => saatBerubah(index, event)}
          onKeyDown={(event) => saatTekan(index, event)}
          onPaste={(event) => saatTempel(index, event)}
          onFocus={(event) => event.target.select()}
          disabled={nonaktif}
          aria-label={`Digit OTP ke-${index + 1}`}
        />
      ))}
    </div>
  );
}
