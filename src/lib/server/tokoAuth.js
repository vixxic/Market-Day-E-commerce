import { cookies } from "next/headers";
import argon2 from "argon2";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import {
  cekBatas,
  hapusKunci,
  tambahHit,
} from "@/lib/server/rateLimitMemori";

const COOKIE_PRODUCTION = "__Host-marketday-toko";
const COOKIE_DEVELOPMENT = "marketday-toko";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOGIN_MAKS_PER_NAMA = 8;
const LOGIN_MAKS_PER_IP = 30;
const LOGIN_JENDELA_MS = 15 * 60 * 1000;

let sudahPeringatkanSecret = false;

function namaCookie() {
  return process.env.NODE_ENV === "production"
    ? COOKIE_PRODUCTION
    : COOKIE_DEVELOPMENT;
}

function daftarNamaCookie() {
  return process.env.NODE_ENV === "production"
    ? [COOKIE_PRODUCTION, COOKIE_DEVELOPMENT]
    : [COOKIE_DEVELOPMENT];
}

function ambilSessionSecret() {
  const rahasia = process.env.TOKO_SESSION_SECRET;

  if (!rahasia) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOKO_SESSION_SECRET wajib diatur untuk production.");
    }

    if (!sudahPeringatkanSecret) {
      console.warn(
        "TOKO_SESSION_SECRET belum diatur. Memakai rahasia sesi pengembangan.",
      );
      sudahPeringatkanSecret = true;
    }

    return "market-day-school-dev-session-secret";
  }

  return rahasia;
}

function hashPassword(password) {
  return argon2.hash(password);
}

let dummyHashPromise = null;

function ambilDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash("marketday-dummy-password");
  }
  return dummyHashPromise;
}

async function passwordCocok(password, stored) {
  if (typeof stored !== "string" || !stored) return false;

  // Password lama non-Argon2 tidak lagi diterima. Tetap jalankan verifikasi
  // dummy agar waktu respons tidak mengungkap status akun.
  if (!stored.startsWith("$argon2")) {
    try {
      await argon2.verify(await ambilDummyHash(), password);
    } catch {
      // abaikan
    }
    return false;
  }

  try {
    return await argon2.verify(stored, password);
  } catch {
    return false;
  }
}

function versiSesi(passwordHash) {
  return createHmac("sha256", ambilSessionSecret())
    .update(`sesi:${String(passwordHash)}`)
    .digest("base64url")
    .slice(0, 22);
}

function tandaTangan(payload) {
  return createHmac("sha256", ambilSessionSecret())
    .update(payload)
    .digest("base64url");
}

function buatToken(toko) {
  if (!toko?.versi) {
    throw new Error("Versi sesi toko tidak tersedia.");
  }

  const payload = Buffer.from(
    JSON.stringify({
      id: String(toko.id),
      namaToko: toko.namaToko,
      ver: toko.versi,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  ).toString("base64url");

  return `${payload}.${tandaTangan(payload)}`;
}

function bacaToken(token) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(tandaTangan(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length) return null;

  if (!timingSafeEqual(actual, expected)) return null;

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof session.id !== "string" ||
      !UUID_PATTERN.test(session.id) ||
      typeof session.ver !== "string" ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return { id: session.id, namaToko: session.namaToko, ver: session.ver };
  } catch {
    return null;
  }
}

async function ambilTokoApi() {
  const { data, error } = await supabaseServer
    .from("stores")
    .select("id, nama_toko, password_hash, aktif");

  if (error) throw new Error(`Gagal mengambil data toko: ${error.message}`);

  return data.map((toko) => ({
    id: toko.id,
    namaToko: toko.nama_toko,
    passwordHash: toko.password_hash,
    aktif: toko.aktif,
  }));
}

export async function daftarkanToko(namaToko, password, whatsappNumber) {
  const daftar = await ambilTokoApi();
  if (
    daftar.some(
      (toko) =>
        String(toko.namaToko).trim().toLocaleLowerCase() ===
        namaToko.toLocaleLowerCase(),
    )
  ) {
    const error = new Error("Nama toko sudah terdaftar.");
    error.status = 400;
    error.publik = true;
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const { data, error } = await supabaseServer
    .from("stores")
    .insert([
      {
        nama_toko: namaToko,
        password_hash: passwordHash,
        whatsapp_number: whatsappNumber || null,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Gagal mendaftarkan toko: ${error.message}`);
  return {
    id: String(data.id),
    namaToko: data.nama_toko,
    versi: versiSesi(passwordHash),
  };
}

export async function autentikasiToko(namaToko, password) {
  const daftar = await ambilTokoApi();
  const toko = daftar.find(
    (item) =>
      String(item.namaToko).trim().toLocaleLowerCase() ===
        namaToko.toLocaleLowerCase() &&
      item.aktif !== false,
  );

  if (!toko) {
    // Verifikasi dummy agar waktu respons untuk nama toko yang tidak ada
    // serupa dengan nama toko yang ada.
    try {
      await argon2.verify(await ambilDummyHash(), password);
    } catch {
      // abaikan
    }

    const error = new Error("Nama toko atau password tidak sesuai.");
    error.status = 401;
    throw error;
  }

  const stored = toko.passwordHash;
  if (!(await passwordCocok(password, stored))) {
    const error = new Error("Nama toko atau password tidak sesuai.");
    error.status = 401;
    throw error;
  }

  return {
    id: String(toko.id),
    namaToko: toko.namaToko,
    versi: versiSesi(stored),
  };
}

/** Bentuk toko yang aman dikirim ke browser (tanpa versi sesi). */
export function tokoPublik(toko) {
  return {
    id: String(toko.id),
    namaToko: toko.namaToko,
  };
}

export function cekBatasLogin(ip, namaToko) {
  const nama = namaToko.trim().toLocaleLowerCase();
  const kunciNama = `login:${ip}:${nama}`;
  const kunciIp = `login-ip:${ip}`;

  const batasNama = cekBatas(kunciNama, LOGIN_MAKS_PER_NAMA);
  const batasIp = cekBatas(kunciIp, LOGIN_MAKS_PER_IP);

  if (!batasNama.boleh || !batasIp.boleh) {
    return {
      boleh: false,
      tungguDetik: Math.ceil(
        Math.max(batasNama.tungguMs ?? 0, batasIp.tungguMs ?? 0) / 1000,
      ),
    };
  }

  return { boleh: true };
}

export function catatLoginGagal(ip, namaToko) {
  const nama = namaToko.trim().toLocaleLowerCase();
  tambahHit(`login:${ip}:${nama}`, LOGIN_MAKS_PER_NAMA, LOGIN_JENDELA_MS);
  tambahHit(`login-ip:${ip}`, LOGIN_MAKS_PER_IP, LOGIN_JENDELA_MS);
}

export function bersihkanLoginGagal(ip, namaToko) {
  const nama = namaToko.trim().toLocaleLowerCase();
  hapusKunci(`login:${ip}:${nama}`);
  hapusKunci(`login-ip:${ip}`);
}

export async function setelSesiToko(toko) {
  const cookieStore = await cookies();
  cookieStore.set(namaCookie(), buatToken(toko), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function hapusSesiToko() {
  const cookieStore = await cookies();

  for (const nama of daftarNamaCookie()) {
    cookieStore.set(nama, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
}

export async function bacaSesiToko(request) {
  const headerCookie = request.headers.get("cookie");
  if (!headerCookie) return null;

  const pasangan = new Map();
  for (const bagian of headerCookie.split(";")) {
    const potongan = bagian.trim();
    const posisi = potongan.indexOf("=");
    if (posisi <= 0) continue;
    pasangan.set(
      potongan.slice(0, posisi),
      potongan.slice(posisi + 1),
    );
  }

  let nilaiCookie = null;
  for (const nama of daftarNamaCookie()) {
    if (pasangan.has(nama)) {
      nilaiCookie = pasangan.get(nama);
      break;
    }
  }

  if (!nilaiCookie) return null;

  try {
    const sesi = bacaToken(decodeURIComponent(nilaiCookie));
    if (!sesi) return null;

    const { data, error } = await supabaseServer
      .from("stores")
      .select("id, nama_toko, aktif, password_hash")
      .eq("id", sesi.id)
      .maybeSingle();

    if (error || !data || data.aktif === false || !data.password_hash) {
      return null;
    }

    const versiTersimpan = versiSesi(data.password_hash);
    const bufferSesi = Buffer.from(sesi.ver);
    const bufferTersimpan = Buffer.from(versiTersimpan);

    if (
      bufferSesi.length !== bufferTersimpan.length ||
      !timingSafeEqual(bufferSesi, bufferTersimpan)
    ) {
      return null;
    }

    return {
      id: String(data.id),
      namaToko: data.nama_toko,
    };
  } catch {
    return null;
  }
}
