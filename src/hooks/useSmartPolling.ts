import { useState, useEffect, useRef, useCallback } from "react";
import { getMarketState, type MarketState } from "@/lib/market-hours";

export function useSmartPolling(tickers: string[], pollingInterval = 4000) {
  const [marketState, setMarketState] = useState<MarketState>(getMarketState());
  const [data, setData] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('idxgp:last_market_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.data || [];
      }
    } catch (e) {
      console.error('Failed to load cached market data:', e);
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    try {
      const cached = localStorage.getItem('idxgp:last_market_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.timestamp ? new Date(parsed.timestamp) : null;
      }
    } catch (e) {}
    return null;
  });

  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentInterval, setCurrentInterval] = useState(pollingInterval);

  const timeoutRef = useRef<any>(null);
  const isFetchingRef = useRef(false);
  const tickersRef = useRef(tickers);
  const firstErrorTimeRef = useRef<number | null>(null);

  // Sync tickers to ref to avoid effect trigger on tickers reference change
  useEffect(() => {
    tickersRef.current = tickers;
  }, [tickers]);

  const fetchData = useCallback(async () => {
    const currentTickers = tickersRef.current;
    if (isFetchingRef.current || currentTickers.length === 0) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      // Ensure market indices are included in real-time scan requests
      const scanTickers = Array.from(new Set([...currentTickers, 'COMPOSITE', 'LQ45', 'IDX30']));
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: scanTickers,
          columns: ['close', 'change', 'change_abs', 'volume', 'high', 'low', 'Recommend.All']
        })
      });
      if (res.ok) {
        const json = await res.json();
        const freshData = json.data || [];
        setData(freshData);
        const now = new Date();
        setLastUpdated(now);
        setErrorStatus(null);
        setCurrentInterval(pollingInterval);
        setIsInitialLoading(false);
        firstErrorTimeRef.current = null;
        setConnectionStatus('connected');
        try {
          localStorage.setItem('idxgp:last_market_data', JSON.stringify({
            timestamp: now.toISOString(),
            data: freshData
          }));
        } catch (e) {
          console.error('Failed to cache market data:', e);
        }
      } else {
        setErrorStatus(res.status);
        if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
          setCurrentInterval(prev => Math.min(prev * 2, 16000));
        }
      }
    } catch (err) {
      console.error('Polling fetch failed:', err);
      setErrorStatus(500);
      setCurrentInterval(prev => Math.min(prev * 2, 16000));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [pollingInterval]);

  // Tick to update market state and connection status
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketState(getMarketState());

      // Update connection status
      const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      const hasError = isOffline || errorStatus !== null;
      if (hasError) {
        if (firstErrorTimeRef.current === null) {
          firstErrorTimeRef.current = Date.now();
        }
        const elapsed = Date.now() - firstErrorTimeRef.current;
        if (elapsed > 60000) {
          setConnectionStatus('disconnected');
        } else {
          setConnectionStatus('reconnecting');
        }
      } else {
        firstErrorTimeRef.current = null;
        setConnectionStatus('connected');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [errorStatus]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      fetchData();
    };
    const handleOffline = () => {
      setOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData]);

  // Set up polling interval loop
  useEffect(() => {
    if (marketState !== 'MARKET_OPEN' || offline) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const poll = async () => {
      if (document.visibilityState === 'visible') {
        await fetchData();
      }
      timeoutRef.current = setTimeout(poll, currentInterval);
    };

    poll();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [marketState, offline, fetchData, currentInterval]);

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
    setIsInitialLoading(true);
    fetchData();
  }, [tickers, fetchData]);

  return { marketState, data, loading, lastUpdated, refresh, offline, errorStatus, connectionStatus, isInitialLoading };
}
