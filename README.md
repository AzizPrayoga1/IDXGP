# IDXGP — IDX Stock Watchlist Monitoring Dashboard

IDXGP adalah dashboard pemantauan watchlist saham Bursa Efek Indonesia (IDX) real-time yang ringan, berbiaya Rp 0 (zero backend cost) di Cloudflare Pages, Pages Functions, dan Cloudflare D1 Database (SQLite).

## Fitur Utama & Kesesuaian PRD (Product Requirement Document)

Berikut adalah daftar fitur penting dari PRD yang telah sukses diimplementasikan secara penuh:

### 1. Watchlist & Group Management (FR-4.1)
- **Grup Watchlist Kustom & Preset**: Mendukung pembuatan grup watchlist baru dengan validasi keunikan nama (maks 30 karakter). Grup default bawaan telah di-seed (Big Banks, LQ45 Core, Mining & Energy, Tech & Digital).
- **CRUD Grup Lintas-Perangkat**:
  - Menyimpan modifikasi grup (tambah, rename, hapus) langsung ke penyimpanan cloud (Cloudflare D1 Database) dengan fallback lokal `localStorage` jika offline.
  - Clone-on-edit pattern pada preset: Grup preset (`isPreset: true`) tidak bisa diedit/dihapus, melainkan harus diduplikasi secara otomatis (clone-on-edit).
- **Manajemen Ticker Saham**: Tambah saham baru dengan validasi regex format IDX (`^[A-Z]{4}$`) dan validasi keberadaan kode saham di database IDX. Penghapusan saham dilengkapi tombol "Undo" berdurasi 5 detik.

### 2. Live Data Grid & UI (FR-4.2)
- **Terminal Trading UI**: Grid modern menampilkan info Ticker, Last Price (format lokal Indonesia `id-ID`), Change (Absolute & %), Volume, High/Low, dan Rating Teknis TradingView (Strong Buy, Buy, Neutral, Sell, Strong Sell).
- **Auto Flash Color Effect**: Efek visual animasi pulse box-shadow warna hijau (harga naik) atau merah (harga turun) secara instan saat polling data mendeteksi perbedaan harga.
- **IDX Color Coding**: Pewarnaan teks visual standar bursa (Hijau untuk kenaikan, Merah untuk penurunan, dan Kuning untuk harga tidak berubah/stale).

### 3. Smart Polling Engine (FR-4.3)
- **State Bursa Efek (Asia/Jakarta Timezone)**: Polling otomatis hanya aktif pada jam bursa buka (`MARKET_OPEN`: Senin-Jumat 09:00-12:00 & 13:30-16:00 WIB). Pada jam istirahat (`MARKET_BREAK`) atau bursa tutup (`MARKET_CLOSED`), polling dijeda untuk menghemat resource bandwidth dan limit kuota.
- **Page Visibility & Network Integration**: Polling dijeda otomatis jika tab tidak fokus atau browser sedang minimize, dan akan langsung melakukan satu fetch instan saat tab kembali fokus (`visibilitychange`).
- **Debounced Manual Refresh**: Tombol refresh manual dilengkapi dengan throttle/debounce 1 detik untuk mencegah spam-click.

### 4. Keamanan & Proteksi Akses Multi-User (Section 5.2 / Kustom)
- **Password-Protected Cloud Sync**: Pengamanan akses sinkronisasi data grup menggunakan password (min 8 karakter, mengandung huruf dan angka).
- **Opaque Session Token**: Validasi token bearer sesi (berlaku 24 jam) yang aman via header `Authorization: Bearer <token>`.
- **IP & User Rate Limiting**: Limitasi percobaan masuk salah (maks 5 kali per menit per IP, atau 5 kali per 15 menit per user) di-track via tabel `login_attempts` SQLite D1.
- **Secure Password Hashing**: Hashing password menggunakan `SHA-256` yang dipadukan dengan *random unique salt* 16-byte menggunakan Web Crypto API di sisi serverless edge.

### 5. Penanganan Edge Cases & Fallback (Section 6)
- **Network Offline Recovery**: Jika koneksi putus, UI otomatis memudarkan data, menampilkan toast merah status offline, dan beralih ke durasi timer data terakhir (stale data). Melakukan auto-reconnect saat terhubung kembali.
- **Exponential Backoff Polling**: Jika server mengembalikan error 429 (Rate Limit) atau 500+, polling interval akan otomatis naik secara eksponensial (4s -> 8s -> 16s) hingga koneksi kembali normal.
- **Skeleton Shimmer Loader**: Tampilan skeleton layout saat pemuatan awal/beralih grup sebelum data selesai di-fetch untuk mencegah pergeseran layout.

---

## Cara Menjalankan Secara Lokal

```bash
# Install dependencies
npm install

# Jalankan server lokal (Mock API + Frontend Vite)
npm run dev
# → Mock API: http://localhost:8788/api/scan (dan endpoint auth/groups)
# → Frontend: http://localhost:5173
```

## Deploy ke Cloudflare Pages

```bash
# Build dan deploy ke Cloudflare Pages
npm run deploy
```

Sebelum melakukan deploy pertama kali:
1. Buat database D1 baru di Cloudflare:
   ```bash
   npx wrangler d1 create idxgp-db
   ```
2. Copy `database_id` yang dihasilkan ke berkas `wrangler.toml`.
3. Jalankan migrasi database D1 lokal/production:
   ```bash
   npx wrangler d1 execute idxgp-db --file=migrations/0001_create_tables.sql
   npx wrangler d1 execute idxgp-db --file=migrations/0002_add_session_auth.sql
   ```

## Struktur Direktori Project

```
idxgp/
├── functions/api/
│   ├── scan.ts            ← API proxy ke TradingView Scanner API
│   ├── groups.ts          ← Endpoints CRUD Watchlist Groups
│   ├── user/init.ts       ← Registrasi/init user baru dengan password
│   └── auth/verify.ts     ← Verifikasi password & generate session token
├── src/
│   ├── routes/index.tsx    ← Halaman utama SPA Dashboard (React)
│   ├── hooks/             ← Custom React hooks (useSmartPolling)
│   ├── lib/storage.ts      ← Cloud sync layer, hashing, localStorage
│   ├── lib/stocks.data.ts  ← Data preset stocks & indices
│   └── index.css           ← Tailwind CSS + Animations + Themes
├── scripts/mock-api.cjs   ← Mock server Node.js lokal (scan + user + auth + groups)
├── migrations/            ← D1 SQLite database migrations
├── wrangler.toml          ← Konfigurasi wrangler & database D1
└── package.json
```
