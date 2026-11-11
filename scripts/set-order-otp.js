const fs = require("node:fs");
const path = require("node:path");

const enabled = process.argv[2];
if (!["true", "false"].includes(enabled)) {
  throw new Error("Gunakan nilai true atau false.");
}

const envPath = path.resolve(process.cwd(), ".env.local");
const contents = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : "";
const newline = contents.includes("\r\n") ? "\r\n" : "\n";
const lines = contents.split(/\r?\n/);
const indexes = [];

lines.forEach((line, index) => {
  if (/^\s*ORDER_OTP_ENABLED\s*=/.test(line)) indexes.push(index);
});

if (indexes.length > 0) {
  lines[indexes[0]] = `ORDER_OTP_ENABLED=${enabled}`;
  for (const index of indexes.slice(1).reverse()) lines.splice(index, 1);
} else {
  if (lines.at(-1) === "") lines.pop();
  lines.push(`ORDER_OTP_ENABLED=${enabled}`);
}

fs.writeFileSync(envPath, `${lines.join(newline)}${newline}`);
console.log(
  `OTP pemesanan ${enabled === "true" ? "diaktifkan" : "dinonaktifkan"} di .env.local. Mulai ulang server Next.js agar perubahan berlaku.`,
);
