import { useState, useEffect, useRef, useCallback } from "react";
import { getMarketState, type MarketState } from "@/lib/market-hours";

export function useSmartPolling(tickers: string[], pollingInterval = 4000) {
  const [marketState, setMarketState] = useState<MarketState>(getMarketState());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timeoutRef = useRef<any>(null);
  const isFetchingRef = useRef(false);
  const tickersRef = useRef(tickers);

  // Sync tickers to ref to avoid effect trigger on tickers reference change
  useEffect(() => {
    tickersRef.current = tickers;
  }, [tickers]);

  // Tick to update market state
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketState(getMarketState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    const currentTickers = tickersRef.current;
    if (isFetchingRef.current || currentTickers.length === 0) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: currentTickers,
          columns: ['close', 'change', 'change_abs', 'volume', 'high', 'low', 'Recommend.All']
        })
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Polling fetch failed:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Set up polling interval loop
  useEffect(() => {
    if (marketState !== 'MARKET_OPEN') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const poll = async () => {
      if (document.visibilityState === 'visible') {
        await fetchData();
      }
      timeoutRef.current = setTimeout(poll, pollingInterval);
    };

    poll();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [marketState, fetchData, pollingInterval]);

  // Visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && marketState === 'MARKET_OPEN') {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchData, marketState]);

  // Manual refresh debounced/throttled
  const debounceTimer = useRef<any>(null);
  const refresh = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchData();
    }, 300);
  }, [fetchData]);

  // Fetch immediately on tickers change
  useEffect(() => {
    fetchData();
  }, [tickers, fetchData]);

  return { marketState, data, loading, lastUpdated, refresh };
}
