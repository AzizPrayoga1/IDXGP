import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, LayoutGrid, Search, TrendingDown, TrendingUp, Plus, X, Edit3, Trash2, Undo2, ChevronRight, ListFilter, RefreshCw } from "lucide-react";

import { stocks as defaultStocks, marketIndices, type Stock, formatCompactNumber, formatVolume } from "@/lib/stocks.data";
import { useSmartPolling } from "@/hooks/useSmartPolling";
import { getMarketState, type MarketState } from "@/lib/market-hours";
import { loadGroups, persistGroups, addGroup, renameGroup, deleteGroup, groupAddTicker, groupRemoveTicker, cloneStore, loadPrefs, type GroupsStore } from "@/lib/storage";

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
  const [store, setStore] = useState<GroupsStore>(() => loadGroups());
  const [searchQuery, setSearchQuery] = useState("");
  const [addingTickerGid, setAddingTickerGid] = useState<string | null>(null);
  const [renamingGid, setRenamingGid] = useState<string | null>(null);
  const [deletingGid, setDeletingGid] = useState<string | null>(null);
  const [undoTicket, setUndoTicket] = useState<{ msg: string; gid: string; sym: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState("");
  const [newTicker, setNewTicker] = useState("");
  const [tickerError, setTickerError] = useState("");

  const storeRef = useRef(store);
  storeRef.current = store;

  const persist = useCallback((s: GroupsStore) => { persistGroups(s); setStore(s); }, []);

  const activeGroup = store.groups.find(g => g.id === store.activeGroupId);
  const activeTickers = useMemo(() => {
    const all = defaultStocks.map(s => s.symbol);
    if (store.activeGroupId === '__all__') return all;
    if (!activeGroup) return all;
    // For non-All groups, only poll tickers in the group
    return activeGroup.tickers.length > 0 ? activeGroup.tickers : all;
  }, [store.activeGroupId, activeGroup]);

  const { marketState, data: liveData, loading, refresh } = useSmartPolling(activeTickers);

  const mergedStocks = useMemo(() => {
    return defaultStocks.map(s => {
      const live = liveData.find(l => l.ticker === s.symbol);
      if (live) {
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
          sparkline: currentSparkline,
        };
      }
      return s;
    });
  }, [liveData]);

  const filteredStocks = useMemo(() => {
    let result = mergedStocks;
    if (activeGroup && activeGroup.tickers.length > 0) {
      result = result.filter(s => activeGroup.tickers.includes(s.symbol));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q));
    }
    return result;
  }, [activeGroup, searchQuery, mergedStocks]);

  const topGainers = useMemo(() => [...mergedStocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 4), [mergedStocks]);
  const topLosers = useMemo(() => [...mergedStocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 4), [mergedStocks]);

  // Undo ticker removal with timeout
  const scheduleUndoClear = useRef<any>(null);
  const removeTicker = (gid: string, sym: string) => {
    if (scheduleUndoClear.current) clearTimeout(scheduleUndoClear.current);
    const s = cloneStore(storeRef.current);
    const g = s.groups.find(g => g.id === gid);
    if (!g) return;
    const newStore = groupRemoveTicker(s, gid, sym);
    persist(newStore);
    setUndoTicket({ msg: `Removed ${sym} from ${g.name}`, gid, sym });
    scheduleUndoClear.current = setTimeout(() => setUndoTicket(null), 5000);
  };

  const undoRemove = () => {
    if (!undoTicket) return;
    if (scheduleUndoClear.current) clearTimeout(scheduleUndoClear.current);
    const s = cloneStore(storeRef.current);
    const newStore = groupAddTicker(s, undoTicket.gid, undoTicket.sym);
    persist(newStore);
    setUndoTicket(null);
  };

  const handleCreate = () => {
    const s = cloneStore(storeRef.current);
    const result = addGroup(s, createName);
    if (!result) { setCreateError("Name already exists or invalid"); return; }
    persist(result);
    setCreateName("");
    setCreateError("");
    setShowCreate(false);
  };

  const handleRename = (id: string, name: string) => {
    const s = cloneStore(storeRef.current);
    const result = renameGroup(s, id, name);
    persist(result);
    setRenamingGid(null);
  };

  const handleDelete = (id: string) => {
    const s = cloneStore(storeRef.current);
    persist(deleteGroup(s, id));
    setDeletingGid(null);
  };

  const handleAddTicker = (gid: string) => {
    const sym = newTicker.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(sym)) { setTickerError("Invalid format (4 letters)"); return; }
    if (!defaultStocks.some(s => s.symbol === sym)) { setTickerError(`Ticker ${sym} not found in IDX`); return; }
    const s = cloneStore(storeRef.current);
    const g = s.groups.find(g => g.id === gid);
    if (!g) return;
    if (g.tickers.includes(sym)) { setTickerError(`${sym} already in group`); return; }
    const newStore = groupAddTicker(s, gid, sym);
    persist(newStore);
    setNewTicker("");
    setTickerError("");
  };

  const isCustom = activeGroup && !activeGroup.isPreset && activeGroup.id !== '__all__';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header marketState={marketState} loading={loading} onRefresh={refresh} />

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-1">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Groups</span>
              <button onClick={() => { setShowCreate(true); setCreateName(""); }} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="New Group"><Plus className="h-4 w-4" /></button>
            </div>
            {store.groups.map(g => (
              <div key={g.id} className="group -mx-1 flex items-center rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40">
                {renamingGid === g.id ? (
                  <input
                    autoFocus
                    defaultValue={g.name}
                    onBlur={e => handleRename(g.id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(g.id, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setRenamingGid(null); }}
                    className="min-w-0 flex-1 rounded border border-border bg-card px-1 py-0.5 text-sm text-foreground outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <button
                    onClick={() => { const s = cloneStore(storeRef.current); persist({ ...s, activeGroupId: g.id }); }}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md text-left ${store.activeGroupId === g.id ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${store.activeGroupId === g.id ? 'rotate-90' : ''}`} />
                    <span className={`truncate ${store.activeGroupId === g.id ? 'font-medium' : ''}`}>{g.name}</span>
                    {g.isPreset && g.id !== '__all__' && <span className="shrink-0 rounded bg-muted px-1 py-px text-[10px] text-muted-foreground">preset</span>}
                  </button>
                )}
                {renamingGid !== g.id && g.id !== '__all__' && (
                  <div className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <button onClick={() => setRenamingGid(g.id)} className="rounded p-0.5 text-muted-foreground hover:text-foreground" title="Rename"><Edit3 className="h-3 w-3" /></button>
                    {!g.isPreset && <button onClick={() => setDeletingGid(g.id)} className="rounded p-0.5 text-muted-foreground hover:text-red-400" title="Delete"><Trash2 className="h-3 w-3" /></button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          {!activeGroup || store.activeGroupId === '__all__' ? (
            <>
              <HeroSection marketState={marketState} />
              <MarketIndices />
            </>
          ) : null}

          <section className={store.activeGroupId === '__all__' ? 'mt-12' : ''}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {activeGroup?.name || 'All Stocks'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeGroup ? `${filteredStocks.length} stocks` : 'All available stocks'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Mobile group select */}
                <select
                  value={store.activeGroupId}
                  onChange={e => { const s = cloneStore(storeRef.current); persist({ ...s, activeGroupId: e.target.value }); }}
                  className="block w-44 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground lg:hidden"
                >
                  {store.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
            </div>

            {/* Add ticker bar for custom groups */}
            {isCustom && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  value={newTicker}
                  onChange={e => { setNewTicker(e.target.value.toUpperCase()); setTickerError(""); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTicker(activeGroup!.id); }}
                  placeholder="Add ticker (e.g. BBCA)"
                  maxLength={4}
                  className="w-36 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={() => handleAddTicker(activeGroup.id)} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">+ Add</button>
                {tickerError && <span className="text-xs text-red-400">{tickerError}</span>}
              </div>
            )}

            {/* Mobile group filter pills for non-All */}
            {store.activeGroupId === '__all__' && (
              <GroupFilters
                groups={store.groups.filter(g => g.id !== '__all__')}
                activeGroupId={store.activeGroupId}
                onSelect={id => { const s = cloneStore(storeRef.current); persist({ ...s, activeGroupId: id }); }}
              />
            )}

            {/* Stock grid */}
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredStocks.map(stock => (
                <div key={stock.symbol} className="relative group">
                  <StockCard stock={stock} />
                  {/* Remove button for custom groups */}
                  {isCustom && (
                    <button
                      onClick={() => removeTicker(activeGroup!.id, stock.symbol)}
                      className="absolute right-2 top-2 rounded-full bg-card/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title={`Remove ${stock.symbol}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {filteredStocks.length === 0 && (
                <div className="col-span-full rounded-2xl border border-border bg-card py-16 text-center">
                  <p className="text-muted-foreground">No stocks in this group.</p>
                  {isCustom && <p className="mt-2 text-xs text-muted-foreground">Add tickers using the input above.</p>}
                </div>
              )}
            </div>
          </section>

          {store.activeGroupId === '__all__' && (
            <section className="mt-16 grid gap-6 lg:grid-cols-2">
              <MoversPanel title="Top Gainers" stocks={topGainers} icon={<TrendingUp className="h-5 w-5" />} />
              <MoversPanel title="Top Losers" stocks={topLosers} icon={<TrendingDown className="h-5 w-5" />} />
            </section>
          )}
        </div>
      </div>

      <Footer />

      {/* Create group modal */}
      {showCreate && (
        <Modal title="New Group" onClose={() => setShowCreate(false)}>
          <input
            autoFocus
            value={createName}
            onChange={e => { setCreateName(e.target.value); setCreateError(""); }}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Group name"
            maxLength={30}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {createError && <p className="mt-2 text-xs text-red-400">{createError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={handleCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create</button>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deletingGid && (
        <Modal title="Delete Group" onClose={() => setDeletingGid(null)}>
          <p className="text-sm text-muted-foreground">Are you sure? This action cannot be undone.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDeletingGid(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={() => handleDelete(deletingGid)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Delete</button>
          </div>
        </Modal>
      )}

      {/* Undo toast */}
      {undoTicket && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card px-5 py-3 shadow-lg">
          <span className="text-sm text-foreground">{undoTicket.msg}</span>
          <button onClick={undoRemove} className="flex items-center gap-1 text-sm font-medium text-primary"><Undo2 className="h-3.5 w-3.5" /> Undo</button>
        </div>
      )}
    </div>
  );
}

/* ── Modal wrapper ── */
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 font-heading text-lg font-bold text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ── Group filter pills (desktop sidebar alternative for All Stocks) ── */
function GroupFilters({ groups, activeGroupId, onSelect }: { groups: any[]; activeGroupId: string; onSelect: (id: string) => void }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <ListFilter className="h-4 w-4 text-muted-foreground" />
      <span className="mr-1 text-sm font-medium text-muted-foreground">Filter:</span>
      {groups.map(g => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            activeGroupId === g.id
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >{g.name}</button>
      ))}
    </div>
  );
}

/* ── Stock card ── */
function StockCard({ stock }: { stock: Stock }) {
  const isPositive = stock.changePercent >= 0;
  const isUnchanged = stock.changePercent === 0;
  const chartColor = isUnchanged ? '#6B7280' : isPositive ? '#22c55e' : '#ef4444';
  const changeColor = isUnchanged ? 'text-yellow-500' : isPositive ? 'text-emerald-400' : 'text-red-400';
  const changeBg = isUnchanged ? 'bg-yellow-500/10' : isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10';
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
        <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${changeBg} ${changeColor}`}>
          {isUnchanged ? null : isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {isUnchanged ? '' : isPositive ? '+' : ''}
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
            <Tooltip content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return <div className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">{payload[0].value?.toLocaleString("id-ID")}</div>;
              }
              return null;
            }} />
            <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill={`url(#gradient-${stock.symbol})`} isAnimationActive={false} />
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
          <p className="mt-0.5 font-medium text-foreground number-tabular">{formatCompactNumber(stock.marketCap * 1_000_000_000)} T</p>
        </div>
      </div>
    </div>
  );
}

/* ── Header ── */
function Header({ marketState, loading, onRefresh }: { marketState: MarketState; loading: boolean; onRefresh: () => void }) {
  const getStatusDetails = () => {
    switch (marketState) {
      case 'MARKET_OPEN': return { color: 'bg-emerald-500', text: 'Market Open', pulse: true };
      case 'MARKET_BREAK': return { color: 'bg-amber-500', text: 'Market Break', pulse: false };
      case 'MARKET_CLOSED': default: return { color: 'bg-rose-500', text: 'Market Closed', pulse: false };
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
          <button onClick={onRefresh} disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50" title="Manual Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ── */
function HeroSection({ marketState }: { marketState: MarketState }) {
  const getStatusText = () => {
    switch (marketState) {
      case 'MARKET_OPEN': return 'Market open · IDX';
      case 'MARKET_BREAK': return 'Market break · IDX';
      case 'MARKET_CLOSED': return 'Market closed · IDX';
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

/* ── Market Indices ── */
function MarketIndices() {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(marketIndices).map(([key, idx]) => {
        const isPositive = idx.changePercent >= 0;
        return (
          <div key={key} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{idx.name}</span>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {isPositive ? "+" : ""}{idx.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-heading text-3xl font-bold text-foreground number-tabular">{idx.value.toLocaleString("id-ID")}</span>
              <span className={`text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>{isPositive ? "+" : ""}{idx.change.toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ── Search ── */
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full lg:max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input type="text" placeholder="Search ticker or company..." value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
    </div>
  );
}

/* ── Movers Panel ── */
function MoversPanel({ title, stocks, icon }: { title: string; stocks: Stock[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="font-heading text-xl font-bold">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {stocks.map(stock => {
          const isPositive = stock.changePercent >= 0;
          return (
            <div key={stock.symbol} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold">{stock.symbol.slice(0, 2)}</div>
                <div>
                  <p className="font-heading text-sm font-bold">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground">{stock.sector}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold number-tabular">{stock.price.toLocaleString("id-ID")}</p>
                <p className={`text-xs font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>{isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><LayoutGrid className="h-4 w-4" /></div>
            <span className="font-heading text-sm font-bold">IDXGP</span>
          </div>
          <p className="text-xs text-muted-foreground">Demo dashboard for IDX stock groups. Data is illustrative and not real-time financial advice.</p>
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
