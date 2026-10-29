This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Struktur data aplikasi

- `src/Context/AuthContext.jsx` menyediakan daftar toko publik dan state sesi toko melalui `/api/toko/*`.
- `src/Context/ProdukContext.jsx` mengelola katalog produk melalui `/api/produk`.
- `src/Context/KeranjangContext.jsx` mengelola keranjang di `localStorage`.
- `src/Context/PesananContext.jsx` mengelola pemesanan sementara lokal dan pesanan dari `/api/pesanan`.
- `src/providers/GlobalProvider.jsx` menggabungkan provider aplikasi; `GlobalContext` tetap menyimpan state antarmuka.
- `src/lib/api/produkApi.js`, `src/lib/api/tokoApi.js`, dan `src/lib/api/pesananApi.js` berisi komunikasi API.
- `src/lib/keranjang.js` menangani data keranjang, sedangkan `src/lib/pesanan.js` menangani salinan riwayat lokal pembeli.

Data toko, produk, pesanan, dan analitik disimpan di Supabase. Browser hanya memanggil Route Handler aplikasi (`/api/*`); akses langsung ke tabel memakai service-role key di server. Isi `.env`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-dari-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-dari-supabase>
SUPABASE_STORAGE_BUCKET=produk
NEXT_PUBLIC_SITE_URL=https://<domain-aplikasi>
```

`NEXT_PUBLIC_SITE_URL` dipakai sebagai `metadataBase` agar URL gambar Open Graph/Twitter menjadi absolut (nilai tanpa `https://` otomatis dilengkapi). Di Vercel, nilai ini dapat diganti otomatis dari `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` bila variabel tersebut tidak diatur. Ikon situs memakai `public/TR.png`, sedangkan gambar pratinjau tautan memakai `public/banner-market-day.jpg` (1200×600).

Jangan pernah memberi prefix `NEXT_PUBLIC_` pada `SUPABASE_SERVICE_ROLE_KEY` atau `FONNTE_API`.

Upload foto produk dan foto profil toko memakai Supabase Storage dengan tiga variabel berikut di `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_STORAGE_BUCKET=produk
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-dari-supabase>
```

Ambil URL project dan service-role key dari dashboard project Supabase (Project Settings → API / API Keys). Buat bucket dengan nama yang sama seperti `SUPABASE_STORAGE_BUCKET` dan atur sebagai **public** agar URL foto dapat ditampilkan. Ganti nilai contoh dengan konfigurasi project Anda, jangan membagikan service-role key, dan jangan pernah memberi key tersebut prefix `NEXT_PUBLIC_` karena hanya boleh digunakan Route Handler server. Setelah mengubah `.env.local`, mulai ulang server Next.js. Endpoint unggah akan menyebutkan nama variabel yang belum diatur jika konfigurasinya masih kurang.

Galeri produk menyimpan hingga lima URL foto dalam kolom `products.gambar_list`. Terapkan migrasi `supabase/migrations/20261027090000_add_product_image_gallery.sql` pada project Supabase sebelum memakai versi aplikasi ini; migrasi tersebut juga menyalin foto lama ke galeri.

Pesanan baru dikirim ke `POST /api/pesanan` hanya dengan `id_toko`, `nama_penerima`, `nomor_pemesan`, dan `items` (`id_produk`, `jumlah`, `varian`). Server memvalidasi toko dan produk, menghitung ulang harga serta total dari database, lalu membuat `id_pesanan`, `kode_klaim`, dan `status: "menunggu_otp"` sendiri. Nilai `total`, `harga`, `status`, atau ID yang dikirim klien diabaikan. Status pesanan hanya dapat dibaca dengan menyertakan `kode_klaim` yang cocok.

Pengiriman OTP WhatsApp memerlukan token API Fonnte di `.env.local`:

```dotenv
FONNTE_API=<token-api-fonnte>
```

Jangan gunakan prefix `NEXT_PUBLIC_` untuk token ini. Setelah menambah atau mengubah token, mulai ulang server Next.js. Pastikan token dan perangkat WhatsApp yang terhubung di akun Fonnte masih aktif.

Halaman pengelolaan toko tersedia di `/kelolatoko`. Route Handler di `/api/toko/*` memproses registrasi, login, logout, sesi toko, produk, pesanan, profil, dan analitik. Password baru disimpan sebagai hash Argon2 di Supabase dan minimal 8 karakter. Baris password lama yang bukan Argon2 ditolak dan harus diatur ulang; tidak ada lagi perbandingan plaintext.

### Keamanan dan variabel lingkungan

Atur variabel berikut pada deployment production:

```dotenv
TOKO_SESSION_SECRET=<string-acak-panjang>
OTP_HASH_SECRET=<string-acak-panjang>
```

- `TOKO_SESSION_SECRET` menandatangani cookie sesi toko (HMAC-SHA256, 7 hari, `HttpOnly`, `SameSite=Lax`, dan prefix `__Host-` di production). Ganti nilainya untuk membatalkan semua sesi lama. Cookie juga memuat versi turunan hash password, sehingga mengganti password toko otomatis membatalkan cookie lamanya.
- `OTP_HASH_SECRET` menjadi kunci HMAC-SHA256 untuk hash OTP yang terikat ke ID pesanan. Jika tidak diatur, aplikasi memakai `TOKO_SESSION_SECRET`; di production salah satunya wajib ada.
- Login toko dibatasi per IP dan per nama toko (8 kegagalan per 15 menit per toko, 30 per 15 menit per IP). Pengiriman OTP dibatasi per nomor dan per IP, dan nomor yang diminta harus sama dengan `nomor_pemesan` pada pesanan.
- OTP dibuat dengan `crypto.randomInt`, berlaku 5 menit, maksimal 3 percobaan, dan dihapus setelah terverifikasi. `kode_klaim` tidak lagi dikirim melalui WhatsApp; penjual membacanya dari dashboard.
- Unggahan foto memeriksa magic bytes (bukan hanya header MIME), dibatasi 5 MB per file dan kuota 50 MB per toko. URL foto hanya menerima path relatif aplikasi atau URL HTTPS (HTTP juga diizinkan saat development).
- `next.config.mjs` menambahkan CSP dan header keamanan lain (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, dan HSTS di production).
- Rotasi `SUPABASE_SERVICE_ROLE_KEY` dan `FONNTE_API` jika file `.env` pernah dibagikan. Jangan pernah memberi prefix `NEXT_PUBLIC_` pada kedua nilai tersebut.

### Profil toko, halaman toko publik, dan analitik

Terapkan migrasi `supabase/migrations/20261028120000_add_store_profiles_and_analytics.sql` pada project Supabase untuk mengaktifkan kolom profil toko (`deskripsi`, `foto_profil`, `banner`, `lokasi`) dan tabel `product_views`. Tanpa migrasi ini aplikasi tetap berjalan, tetapi halaman profil menampilkan peringatan, halaman toko memakai data bawaan, dan analitik kunjungan produk tidak tersedia.

- Profil toko dapat diubah di `/kelolatoko/profil` (nama tampilan, deskripsi, lokasi, nomor WhatsApp, foto profil, dan banner). Foto diunggah ke bucket Supabase Storage yang sama dengan `SUPABASE_STORAGE_BUCKET`. Pendaftaran toko baru di `/daftar-toko` mewajibkan foto profil dan banner; keduanya diunggah setelah akun toko dibuat, lalu disimpan ke profil.
- Halaman toko publik tersedia di `/toko/[id]` dan menampilkan banner, foto profil, deskripsi, lokasi, kontak WhatsApp, serta katalog produk toko. Saat pemilik toko sedang masuk, tombol edit tampil pada banner dan foto profil dan mengarah ke `/kelolatoko/profil`.
- Analitik toko tampil pada dashboard `/kelolatoko` dan memadukan data pesanan dengan jumlah kunjungan produk dari `product_views`. Kunjungan dicatat oleh Route Handler `POST /api/produk/[id]/kunjungan` saat halaman detail produk dibuka.
- Status pesanan berubah ke `diproses` saat toko menerima, lalu `selesai` saat pesanan diserahkan. Pesanan selesai tidak dihapus: tetap terhitung di analitik (pendapatan dan produk terjual) dan tampil di `/kelolatoko/riwayat` dengan filter bulan dan tanggal spesifik, beserta ringkasan per periode.
**Batasan prototipe:** Route Handler tidak mengirim password/hash ke antarmuka dan membatasi operasi toko melalui sesi aplikasi. Aktifkan Row Level Security pada tabel Supabase sebagai lapisan pertahanan tambahan; aplikasi sendiri mengakses tabel melalui service role di server, sedangkan browser memakai endpoint `/api/*`. Cocokkan penggunaan dengan kebutuhan prototipe Market Day sekolah dan jangan simpan data sensitif yang tidak diperlukan.

## Getting Started

Proyek ini memakai [Bun](https://bun.sh) sebagai package manager. Pasang dependensi lalu jalankan server pengembangan:

```bash
bun install
bun dev
```

Perintah lain:

```bash
bun run build
bun run lint
bun start
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
