This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Struktur data aplikasi

- `src/context/AuthContext.jsx` menyediakan daftar toko publik dan state sesi toko melalui endpoint autentikasi toko.
- `src/context/ProdukContext.jsx` mengelola produk dari MockAPI.
- `src/context/KeranjangContext.jsx` mengelola keranjang di `localStorage`.
- `src/context/PesananContext.jsx` mengelola pemesanan sementara lokal dan pesanan dari API.
- `src/providers/GlobalProvider.jsx` menggabungkan provider aplikasi; `GlobalContext` tetap menyimpan state antarmuka.
- `src/lib/api/produkApi.js`, `src/lib/api/tokoApi.js`, dan `src/lib/api/pesananApi.js` berisi komunikasi API.
- `src/lib/keranjang.js` menangani data keranjang, sedangkan `src/lib/pesanan.js` menangani salinan riwayat lokal pembeli.

URL API toko, produk, dan pesanan dikonfigurasi melalui `NEXT_PUBLIC_API_TOKO_URL`, `NEXT_PUBLIC_API_PRODUK_URL`, dan `NEXT_PUBLIC_API_PESANAN_URL` di `.env.local`. Atur ketiga variabel tersebut sebelum menjalankan aplikasi; karena digunakan oleh client browser, nilainya bukan tempat untuk menyimpan rahasia atau token.

Upload foto produk memerlukan tiga variabel Supabase Storage berikut di `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_STORAGE_BUCKET=produk
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-dari-supabase>
```

Ambil URL project dan service-role key dari dashboard project Supabase (Project Settings → API / API Keys). Buat bucket dengan nama yang sama seperti `SUPABASE_STORAGE_BUCKET` dan atur sebagai **public** agar URL foto dapat ditampilkan. Ganti nilai contoh dengan konfigurasi project Anda, jangan membagikan service-role key, dan jangan pernah memberi key tersebut prefix `NEXT_PUBLIC_` karena hanya boleh digunakan Route Handler server. Setelah mengubah `.env.local`, mulai ulang server Next.js. Endpoint unggah akan menyebutkan nama variabel yang belum diatur jika konfigurasinya masih kurang.

Pesanan baru dikirim ke API pesanan dengan `idCheckout`, `idPesanan`, `id_toko`, identitas pemesan, total, status, `item` berisi rincian produk dan varian, serta `createdAt`. Setiap transaksi mengirim satu pesanan untuk satu toko.

Halaman pengelolaan toko tersedia di `/kelolatoko`. Route Handler di `/api/toko/*` memproses registrasi, login, logout, sesi toko, produk, dan pesanan. Password baru disimpan sebagai hash Argon2 di Supabase. Atur `TOKO_SESSION_SECRET` pada deployment production. MockAPI tetap merupakan API publik untuk keperluan prototipe sekolah; pembatasan kepemilikan diterapkan pada Route Handler aplikasi dan tidak dapat mencegah seseorang memanggil MockAPI langsung.

**Batasan prototipe:** Route Handler menghindari pengiriman password/hash ke antarmuka dan membatasi operasi toko melalui sesi aplikasi. MockAPI tetap publik dan tidak memberikan otorisasi server-side, jadi pengguna masih dapat memanggil endpoint MockAPI langsung. Cocokkan penggunaan dengan kebutuhan prototipe Market Day sekolah dan jangan simpan data sensitif di sana.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
