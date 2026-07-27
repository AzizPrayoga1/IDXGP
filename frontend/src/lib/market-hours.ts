export type MarketState = 'MARKET_OPEN' | 'MARKET_BREAK' | 'MARKET_CLOSED';

export function getMarketState(date = new Date()): MarketState {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short', // 'Sun', 'Mon', etc.
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || "";

  const weekday = getVal('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') {
    return 'MARKET_CLOSED';
  }

  const hour = parseInt(getVal('hour'), 10);
  const minute = parseInt(getVal('minute'), 10);

  const minutes = hour * 60 + minute;

  // Sesi 1: 09:00 - 12:00 WIB (540m - 720m)
  // Break: 12:00 - 13:30 WIB (720m - 810m)
  // Sesi 2: 13:30 - 16:00 WIB (810m - 960m)
  if (minutes >= 540 && minutes < 720) return 'MARKET_OPEN';
  if (minutes >= 720 && minutes < 810) return 'MARKET_BREAK';
  if (minutes >= 810 && minutes < 960) return 'MARKET_OPEN';

  return 'MARKET_CLOSED';
}
