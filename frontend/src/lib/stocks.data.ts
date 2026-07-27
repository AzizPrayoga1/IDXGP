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
  jci: { name: "IHSG", value: 7154.82, change: 23.15, changePercent: 0.32 },
  lq45: { name: "LQ45", value: 936.44, change: -1.28, changePercent: -0.14 },
  idx30: { name: "IDX30", value: 492.71, change: 4.53, changePercent: 0.93 },
};

export const stockGroups: Record<string, string[]> = {
  "Blue Chip": ["BBCA", "BBRI", "TLKM", "ASII", "UNVR"],
  "Banking": ["BBCA", "BBRI", "BMRI", "BBNI", "BRIS"],
  "Technology": ["GOTO", "BELI", "DCII", "MTEL", "TOWR"],
  "Energy": ["ADRO", "ITMG", "PTBA", "INDY", "ANTM"],
  "Consumer": ["UNVR", "ICBP", "MYOR", "AISA", "GOOD"],
};

export const stocks: Stock[] = [
  { symbol: "BBCA", name: "Bank Central Asia", sector: "Financials", price: 9225, change: 125, changePercent: 1.37, volume: 12450000, marketCap: 1134.2, pe: 18.4, week52Low: 7625, week52High: 9525, sparkline: [9050, 9080, 9125, 9100, 9150, 9125, 9180, 9200, 9225, 9210, 9235, 9225] },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia", sector: "Financials", price: 4380, change: -45, changePercent: -1.02, volume: 28700000, marketCap: 648.5, pe: 12.1, week52Low: 3890, week52High: 4890, sparkline: [4450, 4430, 4420, 4400, 4410, 4395, 4385, 4375, 4385, 4380, 4375, 4380] },
  { symbol: "TLKM", name: "Telkom Indonesia", sector: "Communication", price: 3780, change: 62, changePercent: 1.67, volume: 15300000, marketCap: 374.8, pe: 14.2, week52Low: 3120, week52High: 3890, sparkline: [3660, 3685, 3690, 3710, 3700, 3725, 3740, 3755, 3765, 3770, 3785, 3780] },
  { symbol: "ASII", name: "Astra International", sector: "Consumer Cyclical", price: 5125, change: -25, changePercent: -0.48, volume: 8900000, marketCap: 207.4, pe: 16.8, week52Low: 4550, week52High: 5350, sparkline: [5180, 5170, 5160, 5155, 5140, 5135, 5130, 5125, 5130, 5125, 5120, 5125] },
  { symbol: "UNVR", name: "Unilever Indonesia", sector: "Consumer Defensive", price: 3520, change: 18, changePercent: 0.51, volume: 4200000, marketCap: 134.6, pe: 22.5, week52Low: 3150, week52High: 3820, sparkline: [3480, 3490, 3500, 3495, 3505, 3510, 3515, 3525, 3520, 3525, 3518, 3520] },
  { symbol: "GOTO", name: "GoTo Gojek Tokopedia", sector: "Technology", price: 92, change: 3, changePercent: 3.37, volume: 456000000, marketCap: 95.2, pe: -12.3, week52Low: 64, week52High: 128, sparkline: [84, 85, 86, 88, 87, 89, 90, 91, 90, 92, 93, 92] },
  { symbol: "BMRI", name: "Bank Mandiri", sector: "Financials", price: 1620, change: 12, changePercent: 0.75, volume: 32100000, marketCap: 378.9, pe: 10.5, week52Low: 1440, week52High: 1740, sparkline: [1590, 1595, 1600, 1605, 1608, 1612, 1615, 1618, 1620, 1618, 1622, 1620] },
  { symbol: "ADRO", name: "Adaro Energy", sector: "Energy", price: 2860, change: 78, changePercent: 2.8, volume: 18900000, marketCap: 91.7, pe: 8.4, week52Low: 2120, week52High: 2940, sparkline: [2740, 2755, 2770, 2785, 2800, 2810, 2825, 2840, 2850, 2855, 2865, 2860] },
  { symbol: "ITMG", name: "Indo Tambangraya Megah", sector: "Energy", price: 12950, change: 185, changePercent: 1.45, volume: 3100000, marketCap: 46.2, pe: 6.7, week52Low: 9850, week52High: 13400, sparkline: [12600, 12650, 12700, 12750, 12780, 12820, 12860, 12900, 12920, 12940, 12960, 12950] },
  { symbol: "BBNI", name: "Bank Negara Indonesia", sector: "Financials", price: 4380, change: -18, changePercent: -0.41, volume: 14500000, marketCap: 81.4, pe: 9.2, week52Low: 3850, week52High: 4720, sparkline: [4420, 4410, 4405, 4400, 4395, 4390, 4385, 4382, 4385, 4380, 4375, 4380] },
  { symbol: "PTBA", name: "Bukit Asam", sector: "Energy", price: 2760, change: 68, changePercent: 2.53, volume: 12800000, marketCap: 32.1, pe: 7.8, week52Low: 2180, week52High: 2920, sparkline: [2660, 2675, 2680, 2690, 2700, 2710, 2725, 2740, 2750, 2755, 2765, 2760] },
  { symbol: "BRIS", name: "Bank Syariah Indonesia", sector: "Financials", price: 1630, change: 28, changePercent: 1.75, volume: 22400000, marketCap: 24.7, pe: 15.3, week52Low: 1240, week52High: 1740, sparkline: [1570, 1580, 1585, 1590, 1595, 1600, 1605, 1610, 1615, 1620, 1625, 1630] },
  { symbol: "BELI", name: "Blibli", sector: "Technology", price: 142, change: -4, changePercent: -2.74, volume: 187000000, marketCap: 12.8, pe: -8.5, week52Low: 110, week52High: 198, sparkline: [150, 149, 148, 147, 146, 145, 144, 143, 142, 143, 142, 142] },
  { symbol: "INDY", name: "Indika Energy", sector: "Energy", price: 1850, change: 32, changePercent: 1.76, volume: 9500000, marketCap: 18.4, pe: 5.2, week52Low: 1420, week52High: 1980, sparkline: [1780, 1790, 1800, 1805, 1810, 1820, 1825, 1830, 1840, 1845, 1855, 1850] },
  { symbol: "ANTM", name: "Aneka Tambang", sector: "Materials", price: 1650, change: -22, changePercent: -1.32, volume: 21500000, marketCap: 39.6, pe: 11.6, week52Low: 1380, week52High: 1890, sparkline: [1680, 1675, 1670, 1665, 1660, 1658, 1655, 1652, 1650, 1652, 1648, 1650] },
  { symbol: "DCII", name: "DCI Indonesia", sector: "Technology", price: 7450, change: 120, changePercent: 1.64, volume: 1800000, marketCap: 58.3, pe: 32.4, week52Low: 5600, week52High: 8200, sparkline: [7280, 7300, 7320, 7340, 7350, 7380, 7400, 7420, 7430, 7440, 7460, 7450] },
  { symbol: "ICBP", name: "Indofood CBP", sector: "Consumer Defensive", price: 11200, change: 85, changePercent: 0.76, volume: 2600000, marketCap: 65.2, pe: 19.1, week52Low: 9850, week52High: 11850, sparkline: [11050, 11080, 11100, 11120, 11140, 11160, 11180, 11200, 11210, 11205, 11215, 11200] },
  { symbol: "MTEL", name: "Dayamitra Telekomunikasi", sector: "Technology", price: 768, change: -6, changePercent: -0.78, volume: 21000000, marketCap: 89.7, pe: 21.5, week52Low: 640, week52High: 860, sparkline: [780, 778, 776, 774, 772, 770, 769, 768, 769, 768, 767, 768] },
  { symbol: "TOWR", name: "Sarana Menara Nusantara", sector: "Technology", price: 1040, change: 14, changePercent: 1.36, volume: 18500000, marketCap: 56.4, pe: 18.7, week52Low: 890, week52High: 1140, sparkline: [1010, 1015, 1020, 1025, 1030, 1032, 1035, 1038, 1040, 1038, 1042, 1040] },
  { symbol: "MYOR", name: "Mayora Indah", sector: "Consumer Defensive", price: 2480, change: 38, changePercent: 1.56, volume: 7600000, marketCap: 36.1, pe: 24.8, week52Low: 2050, week52High: 2620, sparkline: [2420, 2430, 2440, 2445, 2450, 2455, 2460, 2465, 2470, 2475, 2485, 2480] },
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
