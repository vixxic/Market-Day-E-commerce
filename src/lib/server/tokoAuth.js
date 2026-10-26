import { cookies } from "next/headers";
import argon2 from "argon2";
import { createHmac } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

const COOKIE_NAME = "marketday-toko";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ambilSessionSecret() {
  if (!process.env.TOKO_SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("TOKO_SESSION_SECRET wajib diatur untuk production.");
  }
  return (
    process.env.TOKO_SESSION_SECRET ||
    "market-day-school-dev-session-secret"
  );
}

function hashPassword(password) {
  return argon2.hash(password);
}

async function passwordCocok(password, stored) {
  if (typeof stored !== "string") return false;
  if (stored.startsWith("$argon2")) {
    return argon2.verify(stored, password);
  }
  return stored === password;
}

function tandaTangan(payload) {
  return createHmac("sha256", ambilSessionSecret())
    .update(payload)
    .digest("base64url");
}

function buatToken(toko) {
  const payload = Buffer.from(
    JSON.stringify({
      id: String(toko.id),
      namaToko: toko.namaToko,
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
  
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof session.id !== "string" ||
      !UUID_PATTERN.test(session.id) ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return { id: session.id, namaToko: session.namaToko };
  } catch {
    return null;
  }
}

async function ambilTokoApi() {
  const { data, error } = await supabaseServer
    .from('stores')
    .select('id, nama_toko, password_hash, aktif');
    
  if (error) throw new Error(`Gagal mengambil data toko: ${error.message}`);
  
  return data.map(t => ({
    id: t.id,
    namaToko: t.nama_toko,
    passwordHash: t.password_hash,
    aktif: t.aktif
  }));
}

async function perbaruiTokoApi(id, data) {
  const { data: result, error } = await supabaseServer
    .from('stores')
    .update(data)
    .eq('id', id)
    .select();

  if (error) throw new Error(`Gagal memperbarui data toko: ${error.message}`);
  return result[0];
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
    throw new Error("Nama toko sudah terdaftar.");
  }

  const passwordHash = await hashPassword(password);
  const { data, error } = await supabaseServer
    .from('stores')
    .insert([{ 
      nama_toko: namaToko, 
      password_hash: passwordHash, 
      whatsapp_number: whatsappNumber || null,
    }])
    .select()
    .single();

  if (error) throw new Error(`Gagal mendaftarkan toko: ${error.message}`);
  return { id: String(data.id), namaToko: data.nama_toko };
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
    const error = new Error("Nama toko atau password tidak sesuai.");
    error.status = 401;
    throw error;
  }

  const stored = toko.passwordHash ?? toko.password;
  if (!await passwordCocok(password, stored)) {
    const error = new Error("Nama toko atau password tidak sesuai.");
    error.status = 401;
    throw error;
  }

  if (!stored.startsWith("$argon2")) {
    const passwordHash = await hashPassword(password);
    await perbaruiTokoApi(toko.id, {
      password_hash: passwordHash,
    });
  }

  return { id: String(toko.id), namaToko: toko.namaToko };
}

export async function setelSesiToko(toko) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, buatToken(toko), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function hapusSesiToko() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function bacaSesiToko(request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((bagian) => bagian.trim())
    .find((bagian) => bagian.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;

  try {
    return bacaToken(decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1)));
  } catch {
    return null;
  }
}
