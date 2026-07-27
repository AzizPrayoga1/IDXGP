import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, LayoutGrid, ListFilter, Search, Star, TrendingDown, TrendingUp, Clock, Pause, RefreshCw } from "lucide-react";

import { stocks as defaultStocks, stockGroups, marketIndices, type Stock, formatCompactNumber, formatVolume } from "@/lib/stocks.data";
import { useSmartPolling } from "@/hooks/useSmartPolling";
import { getMarketState, type MarketState } from "@/lib/market-hours";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IDXGP — IDX Stock Dashboard" },
      { name: "description", content: "Track Indonesian stock groups with precision. Real-time IDX market data, watchlists, and portfolio insights." },
      { property: "og:title", content: "IDXGP — IDX Stock Dashboard" },
      { property: "og:description", content: "Track Indonesian stock groups with precision." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeGroup, setActiveGroup] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const activeTickers = useMemo(() => {
    return defaultStocks.map(s => s.symbol);
  }, []);

  // Use smart polling for active tickers (always poll all tickers to keep Movers panels and all group switch data updated)
  const { marketState, data: liveData, loading, refresh } = useSmartPolling(activeTickers);

  const mergedStocks = useMemo(() => {
    return defaultStocks.map(s => {
      const live = liveData.find(l => l.ticker === s.symbol);
      if (live) {
        // Return updated stock data, generating fresh sparkline segment if price changed
        const currentSparkline = [...s.sparkline];
        if (live.lastPrice !== s.price) {
          currentSparkline.shift();
          currentSparkline.push(live.lastPrice);
        }
        return {
          ...s,
          price: live.lastPrice ?? s.price,
          changePercent: live.changePercent ?? s.changePercent,
          change: live.changeAbsolute ?? s.change,
          volume: live.volume ?? s.volume,
          high: live.high ?? s.high,
          low: live.low ?? s.low,
          sparkline: currentSparkline
        };
      }
      return s;
    });
  }, [liveData]);

  const filteredStocks = useMemo(() => {
    let result = mergedStocks;
    if (activeGroup !== "All") {
      const symbols = stockGroups[activeGroup] ?? [];
      result = result.filter((s) => symbols.includes(s.symbol));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q),
      );
    }
    return result;
  }, [activeGroup, searchQuery, mergedStocks]);

  const topGainers = useMemo(() => [...mergedStocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 4), [mergedStocks]);
  const topLosers = useMemo(() => [...mergedStocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 4), [mergedStocks]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header marketState={marketState} loading={loading} onRefresh={refresh} />

      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <HeroSection marketState={marketState} />

        <MarketIndices />

        <section className="mt-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                Group Watchlist
              </h2>
              <p className="mt-1 text-muted-foreground">
                Monitor your curated groups of IDX stocks in real time.
              </p>
            </div>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          <GroupFilters active={activeGroup} onChange={setActiveGroup} />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
            {filteredStocks.length === 0 && (
              <div className="col-span-full rounded-2xl border border-border bg-card py-16 text-center">
                <p className="text-muted-foreground">No stocks match your search.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <MoversPanel title="Top Gainers" stocks={topGainers} icon={<TrendingUp className="h-5 w-5" />} />
          <MoversPanel title="Top Losers" stocks={topLosers} icon={<TrendingDown className="h-5 w-5" />} />
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Header({ marketState, loading, onRefresh }: { marketState: MarketState; loading: boolean; onRefresh: () => void }) {
  const getStatusDetails = () => {
    switch (marketState) {
      case 'MARKET_OPEN':
        return { color: 'bg-emerald-500', text: 'Market Open', pulse: true };
      case 'MARKET_BREAK':
        return { color: 'bg-amber-500', text: 'Market Break', pulse: false };
      case 'MARKET_CLOSED':
        default:
        return { color: 'bg-rose-500', text: 'Market Closed', pulse: false };
    }
  };

  const status = getStatusDetails();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground glow-ember">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">IDXGP</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
            <span className={`h-2 w-2 rounded-full ${status.color} ${status.pulse ? 'animate-pulse' : ''}`} />
            <span>{status.text}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            title="Manual Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ marketState }: { marketState: MarketState }) {
  const getStatusText = () => {
    switch (marketState) {
      case 'MARKET_OPEN':
        return 'Market open · IDX';
      case 'MARKET_BREAK':
        return 'Market break · IDX';
      case 'MARKET_CLOSED':
        return 'Market closed · IDX';
    }
  };

  return (
    <section className="gradient-charcoal relative overflow-hidden rounded-3xl border border-border px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary/60 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${marketState === 'MARKET_OPEN' ? 'bg-emerald-500 animate-pulse' : marketState === 'MARKET_BREAK' ? 'bg-amber-500' : 'bg-rose-500'}`} />
          {getStatusText()}
        </p>
        <h1 className="mt-6 font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Track Indonesian stocks with clarity
        </h1>
        <p className="mt-5 max-w-lg text-lg text-muted-foreground">
          Real-time market data, group watchlists, and clean insights for the Indonesian Stock Exchange (IDX).
        </p>
      </div>
    </section>
  );
}

function MarketIndices() {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(marketIndices).map(([key, idx]) => {
        const isPositive = idx.changePercent >= 0;
        return (
          <div
            key={key}
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{idx.name}</span>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}
              >
                {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {isPositive ? "+" : ""}
                {idx.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-heading text-3xl font-bold text-foreground number-tabular">
                {idx.value.toLocaleString("id-ID")}
              </span>
              <span className={`text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}
                {idx.change.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full lg:max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search ticker or company..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function GroupFilters({ active, onChange }: { active: string; onChange: (g: string) => void }) {
  const groups = ["All", ...Object.keys(stockGroups)];

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <ListFilter className="h-4 w-4" />
        <span className="text-sm font-medium">Group:</span>
      </div>
      {groups.map((group) => (
        <button
          key={group}
          onClick={() => onChange(group)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === group
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {group}
        </button>
      ))}
    </div>
  );
}

function StockCard({ stock }: { stock: Stock }) {
  const isPositive = stock.changePercent >= 0;
  const chartColor = isPositive ? "#22c55e" : "#ef4444";
  const chartData = stock.sparkline.map((value, i) => ({ i, value }));

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:bg-card/80">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-heading text-sm font-bold text-foreground">
            {stock.symbol.slice(0, 2)}
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold leading-none">{stock.symbol}</h3>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{stock.name}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="font-heading text-2xl font-bold text-foreground number-tabular">
            {stock.price.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">IDR per share</p>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
            isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {isPositive ? "+" : ""}
          {stock.changePercent.toFixed(2)}%
        </div>
      </div>

      <div className="mt-4 h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
                      {payload[0].value?.toLocaleString("id-ID")}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#gradient-${stock.symbol})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <p className="text-muted-foreground">Volume</p>
          <p className="mt-0.5 font-medium text-foreground number-tabular">{formatVolume(stock.volume)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Market Cap</p>
          <p className="mt-0.5 font-medium text-foreground number-tabular">
            {formatCompactNumber(stock.marketCap * 1_000_000_000)} T
          </p>
        </div>
      </div>
    </div>
  );
}

function MoversPanel({
  title,
  stocks,
  icon,
}: {
  title: string;
  stocks: Stock[];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="font-heading text-xl font-bold">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {stocks.map((stock) => {
          const isPositive = stock.changePercent >= 0;
          return (
            <div key={stock.symbol} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold">
                  {stock.symbol.slice(0, 2)}
                </div>
                <div>
                  <p className="font-heading text-sm font-bold">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground">{stock.sector}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold number-tabular">{stock.price.toLocaleString("id-ID")}</p>
                <p className={`text-xs font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                  {isPositive ? "+" : ""}
                  {stock.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <span className="font-heading text-sm font-bold">IDXGP</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Demo dashboard for IDX stock groups. Data is illustrative and not real-time financial advice.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Help</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
