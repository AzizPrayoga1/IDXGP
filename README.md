# IDXGP — IDX Live Stock Monitoring Dashboard

Pantau pergerakan harga saham IDX (Indonesia Stock Exchange) secara real-time via grup kustom. Satu halaman, dark theme, zero-cost.

## Fitur

- **Grup saham kustom** — Banking, Energy, Technology, LQ45, dan lainnya. Filter klik untuk lihat per grup.
- **Kartu saham** — harga, perubahan (hijau/merah), sparkline chart, volume, market cap.
- **Indeks pasar** — IHSG, LQ45, IDX30.
- **Search** — cari ticker atau nama perusahaan.
- **Top Gainers / Losers** — 4 saham dengan pergerakan terbesar.
- **Dark theme** — Charcoal & Ember palette, enak dipandang.

## Cara jalanin

```bash
# install dependencies
npm install

# jalanin local (mock API + frontend)
npm run dev
# → Mock API: http://localhost:8788/api/scan
# → Frontend:  http://localhost:5173
```

## Deploy

```bash
npm run deploy
```

Sebelum deploy pertama:
```bash
npx wrangler d1 create idxgp-db
# copy database_id ke wrangler.toml
# WARNING: Jangan commit database_id asli ke git.
# Gunakan `npx wrangler secret put DATABASE_ID` atau CI env var injection.
# Tambahkan `database_id = "dev-placeholder"` di wrangler.toml untuk dev lokal,
# lalu setel ID asli via dashboard Cloudflare atau secrets CI/CD.
npx wrangler d1 execute --file=migrations/0001_create_tables.sql
```

Frontend + API (Pages Function) deploy bareng ke Cloudflare Pages. Satu domain, gak perlu Worker pisah.

## Data Sync

Groups tersimpan di **localStorage + Cloudflare D1**. Export/Import dari sidebar untuk pindah device.

## Struktur

```
idxgp/
├── functions/api/
│   ├── scan.ts            ← API proxy ke TradingView
│   ├── groups.ts          ← Groups CRUD (D1)
│   └── user/init.ts       ← User init (D1)
├── src/
│   ├── routes/index.tsx    ← Halaman utama
│   ├── lib/storage.ts      ← Groups + localStorage + D1 sync
│   ├── lib/stocks.data.ts  ← Data saham & grup
│   └── index.css           ← Tailwind + theme
├── scripts/mock-api.cjs   ← Mock server lokal (scan + groups + user)
├── migrations/            ← D1 schema migration
├── vite.config.ts
├── wrangler.toml
└── package.json
```
