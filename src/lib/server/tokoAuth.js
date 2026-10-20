import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const COOKIE_NAME = "marketday-toko";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const URL_TOKO =
  "https://6ad62c7ef71f154ac48697fd.mockapi.io/Tokomarketday";

function ambilSessionSecret() {
  if (!process.env.TOKO_SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("TOKO_SESSION_SECRET wajib diatur untuk production.");
  }
  return (
    process.env.TOKO_SESSION_SECRET ||
    "market-day-school-dev-session-secret"
  );
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function passwordCocok(password, stored) {
  if (typeof stored !== "string") return false;
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) {
    return stored === password;
  }

  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actual.length === expectedBuffer.length &&
    timingSafeEqual(actual, expectedBuffer)
  );
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
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (!session.id || session.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { id: session.id, namaToko: session.namaToko };
  } catch {
    return null;
  }
}

async function ambilTokoApi() {
  const respons = await fetch(URL_TOKO, { cache: "no-store" });
  if (!respons.ok) {
    throw new Error(`Gagal mengambil data toko (${respons.status}).`);
  }
  const toko = await respons.json();
  if (!Array.isArray(toko)) {
    throw new Error("Format data toko dari API tidak valid.");
  }
  return toko;
}

async function perbaruiTokoApi(id, data) {
  const respons = await fetch(
    `${URL_TOKO}/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    },
  );
  if (!respons.ok) {
    throw new Error(`Gagal memperbarui data toko (${respons.status}).`);
  }
  return respons.json();
}

export async function daftarkanToko(namaToko, password) {
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

  const respons = await fetch(URL_TOKO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      namaToko,
      passwordHash: hashPassword(password),
      aktif: true,
    }),
    cache: "no-store",
  });
  if (!respons.ok) {
    throw new Error(`Gagal mendaftarkan toko (${respons.status}).`);
  }
  const toko = await respons.json();
  return { id: String(toko.id), namaToko: toko.namaToko };
}

export async function autentikasiToko(namaToko, password) {
  const daftar = await ambilTokoApi();
  const toko = daftar.find(
    (item) =>
      String(item.namaToko).trim().toLocaleLowerCase() ===
        namaToko.toLocaleLowerCase() &&
      item.aktif !== false,
  );
  if (!toko) throw new Error("Nama toko atau password tidak sesuai.");

  const stored = toko.passwordHash ?? toko.password;
  if (!passwordCocok(password, stored)) {
    throw new Error("Nama toko atau password tidak sesuai.");
  }

  if (toko.passwordHash !== stored || !String(stored).startsWith("scrypt$")) {
    const { password: _passwordLama, ...tanpaPassword } = toko;
    await perbaruiTokoApi(toko.id, {
      ...tanpaPassword,
      passwordHash: hashPassword(password),
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
