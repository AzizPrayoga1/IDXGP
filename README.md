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
cd frontend && npm install && cd ..

# jalanin local (mock API + frontend)
npm run dev
# → Mock API: http://localhost:8788/api/scan
# → Frontend:  http://localhost:5173
```

## Deploy

```bash
npm run deploy
```

Frontend + API (Pages Function) deploy bareng ke Cloudflare Pages. Satu domain, gak perlu Worker pisah.

## Stack

Frontend | API | Deploy
---|---|---
Vite | Cloudflare Pages Functions | Cloudflare Pages
React 19 | TradingView Scanner API (proxy) | wrangler
TanStack Router | Edge cache (3s) |
Tailwind CSS v4 | Input validation |
Recharts | CORS restricted |

## Struktur

```
idxgp/
├── frontend/
│   ├── functions/api/scan.ts   ← API proxy ke TradingView
│   ├── src/
│   │   ├── routes/index.tsx    ← Halaman utama
│   │   ├── lib/stocks.data.ts  ← Data saham & grup
│   │   └── index.css           ← Tailwind + theme
│   └── vite.config.ts
├── scripts/mock-api.js         ← Mock server lokal
└── package.json                ← Root scripts
```
