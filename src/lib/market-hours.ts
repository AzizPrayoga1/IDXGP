export type MarketState = 'MARKET_OPEN' | 'MARKET_BREAK' | 'MARKET_CLOSED';

export function getMarketState(date = new Date()): MarketState {
  // Mode Testing: Selalu kembalikan MARKET_OPEN agar dapat dites setiap saat
  return 'MARKET_OPEN';
}
