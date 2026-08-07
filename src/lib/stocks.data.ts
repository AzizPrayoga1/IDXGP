export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number;
  week52Low: number;
  week52High: number;
  sparkline: number[];
}

export const marketIndices = {
  jci: { name: "IHSG", value: 6850.50, change: 15.20, changePercent: 0.22 },
  lq45: { name: "LQ45", value: 850.30, change: 2.10, changePercent: 0.25 },
  idx30: { name: "IDX30", value: 430.15, change: 1.05, changePercent: 0.24 },
};

export const stockGroups: Record<string, string[]> = {
  "Blue Chip": ["BBCA", "BBRI", "TLKM", "ASII", "UNVR"],
  "Banking": ["BBCA", "BBRI", "BMRI", "BBNI", "BRIS"],
  "Technology": ["GOTO", "BELI", "DCII", "MTEL", "TOWR"],
  "Energy": ["ADRO", "ITMG", "PTBA", "INDY", "ANTM"],
  "Consumer": ["UNVR", "ICBP", "MYOR"],
};

export const stocks: Stock[] = [
  { symbol: "BBCA", name: "Bank Central Asia", sector: "Financials", price: 6400, change: 50, changePercent: 0.79, volume: 55729700, marketCap: 1134.2, pe: 18.4, week52Low: 5975, week52High: 8975, sparkline: [6320, 6340, 6350, 6330, 6370, 6350, 6390, 6410, 6380, 6390, 6380, 6400] },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia", sector: "Financials", price: 3130, change: 90, changePercent: 2.96, volume: 254102100, marketCap: 648.5, pe: 12.1, week52Low: 2820, week52High: 4890, sparkline: [3020, 3040, 3050, 3030, 3070, 3050, 3090, 3110, 3080, 3090, 3100, 3130] },
  { symbol: "TLKM", name: "Telkom Indonesia", sector: "Communication", price: 2710, change: 60, changePercent: 2.26, volume: 36978000, marketCap: 374.8, pe: 14.2, week52Low: 2500, week52High: 3890, sparkline: [2640, 2650, 2660, 2650, 2670, 2680, 2690, 2700, 2695, 2705, 2700, 2710] },
  { symbol: "ASII", name: "Astra International", sector: "Consumer Cyclical", price: 5125, change: 25, changePercent: 0.49, volume: 21205700, marketCap: 207.4, pe: 16.8, week52Low: 4100, week52High: 5350, sparkline: [5080, 5090, 5100, 5095, 5110, 5105, 5115, 5120, 5115, 5125, 5120, 5125] },
  { symbol: "UNVR", name: "Unilever Indonesia", sector: "Consumer Defensive", price: 1810, change: 5, changePercent: 0.28, volume: 8449700, marketCap: 134.6, pe: 22.5, week52Low: 1750, week52High: 3820, sparkline: [1800, 1805, 1810, 1805, 1812, 1808, 1815, 1810, 1808, 1812, 1808, 1810] },
  { symbol: "GOTO", name: "GoTo Gojek Tokopedia", sector: "Technology", price: 50, change: 0, changePercent: 0, volume: 31526100, marketCap: 95.2, pe: -12.3, week52Low: 48, week52High: 128, sparkline: [49, 50, 49, 50, 50, 50, 51, 50, 49, 50, 50, 50] },
  { symbol: "BMRI", name: "Bank Mandiri", sector: "Financials", price: 4240, change: 40, changePercent: 0.95, volume: 59238700, marketCap: 378.9, pe: 10.5, week52Low: 3800, week52High: 5500, sparkline: [4190, 4200, 4210, 4205, 4220, 4215, 4230, 4235, 4230, 4245, 4235, 4240] },
  { symbol: "ADRO", name: "Adaro Energy", sector: "Energy", price: 2530, change: 30, changePercent: 1.20, volume: 7470100, marketCap: 91.7, pe: 8.4, week52Low: 2120, week52High: 2940, sparkline: [2490, 2500, 2510, 2505, 2515, 2510, 2520, 2525, 2520, 2535, 2525, 2530] },
  { symbol: "ITMG", name: "Indo Tambangraya Megah", sector: "Energy", price: 24800, change: 100, changePercent: 0.40, volume: 262200, marketCap: 46.2, pe: 6.7, week52Low: 9850, week52High: 28000, sparkline: [24650, 24700, 24750, 24720, 24780, 24750, 24820, 24800, 24780, 24820, 24790, 24800] },
  { symbol: "BBNI", name: "Bank Negara Indonesia", sector: "Financials", price: 3650, change: 30, changePercent: 0.83, volume: 10248400, marketCap: 81.4, pe: 9.2, week52Low: 3200, week52High: 4720, sparkline: [3610, 3620, 3630, 3625, 3635, 3630, 3640, 3645, 3640, 3655, 3645, 3650] },
  { symbol: "PTBA", name: "Bukit Asam", sector: "Energy", price: 2370, change: 20, changePercent: 0.85, volume: 4575400, marketCap: 32.1, pe: 7.8, week52Low: 2180, week52High: 2920, sparkline: [2340, 2350, 2355, 2350, 2360, 2355, 2365, 2370, 2365, 2375, 2365, 2370] },
  { symbol: "BRIS", name: "Bank Syariah Indonesia", sector: "Financials", price: 1825, change: 30, changePercent: 1.67, volume: 11294700, marketCap: 24.7, pe: 15.3, week52Low: 1240, week52High: 2740, sparkline: [1790, 1800, 1805, 1800, 1810, 1805, 1815, 1820, 1815, 1830, 1820, 1825] },
  { symbol: "BELI", name: "Blibli", sector: "Technology", price: 256, change: 2, changePercent: 0.79, volume: 554500, marketCap: 12.8, pe: -8.5, week52Low: 110, week52High: 300, sparkline: [253, 254, 254, 253, 255, 254, 256, 255, 254, 256, 255, 256] },
  { symbol: "INDY", name: "Indika Energy", sector: "Energy", price: 2690, change: 140, changePercent: 5.49, volume: 28666600, marketCap: 18.4, pe: 5.2, week52Low: 1420, week52High: 2980, sparkline: [2540, 2560, 2580, 2600, 2620, 2640, 2650, 2670, 2680, 2700, 2680, 2690] },
  { symbol: "ANTM", name: "Aneka Tambang", sector: "Materials", price: 3150, change: 70, changePercent: 2.27, volume: 60690200, marketCap: 39.6, pe: 11.6, week52Low: 1380, week52High: 3500, sparkline: [3070, 3080, 3090, 3100, 3110, 3120, 3130, 3140, 3135, 3145, 3140, 3150] },
  { symbol: "DCII", name: "DCI Indonesia", sector: "Technology", price: 201500, change: 1500, changePercent: 0.75, volume: 600, marketCap: 58.3, pe: 32.4, week52Low: 35000, week52High: 210000, sparkline: [199500, 200000, 200500, 200200, 200800, 200500, 201000, 201200, 201000, 201600, 201200, 201500] },
  { symbol: "ICBP", name: "Indofood CBP", sector: "Consumer Defensive", price: 7700, change: 250, changePercent: 3.36, volume: 6084200, marketCap: 65.2, pe: 19.1, week52Low: 7000, week52High: 11850, sparkline: [7440, 7480, 7520, 7500, 7560, 7540, 7600, 7640, 7620, 7680, 7650, 7700] },
  { symbol: "MTEL", name: "Dayamitra Telekomunikasi", sector: "Technology", price: 434, change: -4, changePercent: -0.91, volume: 20640100, marketCap: 89.7, pe: 21.5, week52Low: 400, week52High: 860, sparkline: [438, 437, 436, 435, 436, 435, 434, 435, 434, 435, 434, 434] },
  { symbol: "TOWR", name: "Sarana Menara Nusantara", sector: "Technology", price: 402, change: 2, changePercent: 0.50, volume: 15542300, marketCap: 56.4, pe: 18.7, week52Low: 380, week52High: 1140, sparkline: [399, 400, 400, 399, 401, 400, 402, 401, 400, 402, 401, 402] },
  { symbol: "MYOR", name: "Mayora Indah", sector: "Consumer Defensive", price: 1680, change: 5, changePercent: 0.30, volume: 2307200, marketCap: 36.1, pe: 24.8, week52Low: 1500, week52High: 2620, sparkline: [1670, 1672, 1675, 1673, 1678, 1675, 1680, 1678, 1676, 1682, 1678, 1680] },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatVolume(value: number): string {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
