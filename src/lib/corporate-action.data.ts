export interface CorporateAction {
  id: string;
  symbol: string;
  type: 'DIVIDEND' | 'RUPS' | 'RIGHTS_ISSUE' | 'STOCK_SPLIT';
  title: string;
  cumDate?: string; // YYYY-MM-DD
  exDate?: string;
  recordingDate?: string;
  paymentDate?: string;
  eventDate?: string; // For RUPS
  cashDividend?: number; // In IDR per share
  dividendYield?: number; // In percent
  location?: string; // For RUPS
  details?: string;
}

export const mockCorporateActions: CorporateAction[] = [
  {
    id: 'ca_bbca_div_1',
    symbol: 'BBCA',
    type: 'DIVIDEND',
    title: 'Dividen Interim 2026',
    cumDate: '2026-08-15',
    exDate: '2026-08-18',
    recordingDate: '2026-08-19',
    paymentDate: '2026-09-02',
    cashDividend: 50,
    dividendYield: 0.78,
    details: 'Dividen interim tunai untuk tahun buku 2026'
  },
  {
    id: 'ca_bbri_div_1',
    symbol: 'BBRI',
    type: 'DIVIDEND',
    title: 'Dividen Tunai Interim',
    cumDate: '2026-08-20',
    exDate: '2026-08-21',
    recordingDate: '2026-08-24',
    paymentDate: '2026-09-05',
    cashDividend: 85,
    dividendYield: 2.71,
    details: 'Pembayaran dividen interim semester 1'
  },
  {
    id: 'ca_tlkm_rups_1',
    symbol: 'TLKM',
    type: 'RUPS',
    title: 'RUPSLB 2026',
    eventDate: '2026-08-25',
    location: 'Telkom Landmark Tower, Jakarta',
    details: 'Persetujuan perubahan susunan pengurus perseroan & rencana aksi korporasi'
  },
  {
    id: 'ca_asii_div_1',
    symbol: 'ASII',
    type: 'DIVIDEND',
    title: 'Dividen Interim 2026',
    cumDate: '2026-08-28',
    exDate: '2026-08-29',
    recordingDate: '2026-09-01',
    paymentDate: '2026-09-15',
    cashDividend: 98,
    dividendYield: 1.91,
    details: 'Dividen interim per saham Rp 98'
  },
  {
    id: 'ca_bmri_rups_1',
    symbol: 'BMRI',
    type: 'RUPS',
    title: 'RUPST Tahun Buku 2025',
    eventDate: '2026-09-04',
    location: 'Plaza Mandiri, Jakarta',
    details: 'Persetujuan Laporan Tahunan dan Penetapan Penggunaan Laba Bersih'
  },
  {
    id: 'ca_icbp_div_1',
    symbol: 'ICBP',
    type: 'DIVIDEND',
    title: 'Dividen Final 2025',
    cumDate: '2026-08-12',
    exDate: '2026-08-13',
    recordingDate: '2026-08-14',
    paymentDate: '2026-08-28',
    cashDividend: 215,
    dividendYield: 2.79,
    details: 'Dividen final tunai tahun buku 2025'
  },
  {
    id: 'ca_itmg_div_1',
    symbol: 'ITMG',
    type: 'DIVIDEND',
    title: 'Dividen Tunai Interim 2026',
    cumDate: '2026-09-10',
    exDate: '2026-09-11',
    recordingDate: '2026-09-14',
    paymentDate: '2026-09-25',
    cashDividend: 1250,
    dividendYield: 5.04,
    details: 'Dividen interim bernilai jumbo per saham Rp 1.250'
  },
  {
    id: 'ca_goto_rups_1',
    symbol: 'GOTO',
    type: 'RUPS',
    title: 'RUPSLB Rencana Buyback',
    eventDate: '2026-08-30',
    location: 'Pasar Minggu, Jakarta Selatan',
    details: 'Persetujuan alokasi dana buyback saham periode 2026-2027'
  }
];

export function getCorporateActionsByTickers(tickers: string[]): CorporateAction[] {
  if (!tickers || tickers.length === 0) return mockCorporateActions;
  const set = new Set(tickers.map(t => t.toUpperCase()));
  return mockCorporateActions.filter(ca => set.has(ca.symbol));
}
