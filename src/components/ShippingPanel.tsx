import { FileText, Search, Truck, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Pengiriman } from '../types';
import { useState, useMemo } from 'react';

interface ShippingPanelProps {
  data: Pengiriman[];
}

const INVALID_ARMADA_VALUES = ['driver', 'kenek', 'armada', ''];

export default function ShippingPanel({ data = [] }: ShippingPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArmada, setSelectedArmada] = useState<string>('all');
  const [collapsedArmadas, setCollapsedArmadas] = useState<Record<string, boolean>>({});

  // Filter valid data and apply search term
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    const lowerSearch = searchTerm.toLowerCase().trim();
    const isSearching = Boolean(lowerSearch);
    const filterArmada = selectedArmada !== 'all' ? selectedArmada.toLowerCase().trim() : null;

    return data.filter((p) => {
      const armada = p.armada ? p.armada.toLowerCase().trim() : '';
      const driver = p.driver ? p.driver.toLowerCase().trim() : '';

      if (!armada || INVALID_ARMADA_VALUES.includes(armada)) return false;
      if (!driver || INVALID_ARMADA_VALUES.includes(driver)) return false;

      if (filterArmada && armada !== filterArmada) return false;

      if (isSearching) {
        return (
          (p.noOrder?.toLowerCase() || '').includes(lowerSearch) ||
          (p.noReceive?.toLowerCase() || '').includes(lowerSearch) ||
          (p.name?.toLowerCase() || '').includes(lowerSearch) ||
          driver.includes(lowerSearch) ||
          armada.includes(lowerSearch) ||
          (p.address?.toLowerCase() || '').includes(lowerSearch)
        );
      }

      return true;
    });
  }, [data, searchTerm, selectedArmada]);

  // Group items by Armada & Driver
  const groupedByArmada = useMemo(() => {
    const map = new Map<string, { armada: string; driver: string; kenek: string; items: Pengiriman[]; totalCbm: number }>();

    filteredData.forEach((item) => {
      const key = item.armada.trim() || 'Lainnya';
      if (!map.has(key)) {
        map.set(key, {
          armada: item.armada,
          driver: item.driver || '-',
          kenek: item.kenek || '-',
          items: [],
          totalCbm: 0,
        });
      }
      const group = map.get(key)!;
      group.items.push(item);
      const cbmNum = parseFloat((item.cbm || '0').toString()) || 0;
      group.totalCbm += cbmNum;
    });

    return Array.from(map.values());
  }, [filteredData]);

  // Unique armadas list for quick filter chips
  const allArmadas = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => {
      const armada = d.armada?.trim();
      if (armada && !INVALID_ARMADA_VALUES.includes(armada.toLowerCase())) {
        set.add(armada);
      }
    });
    return Array.from(set);
  }, [data]);

  const toggleArmada = (armadaName: string) => {
    setCollapsedArmadas((prev) => ({
      ...prev,
      [armadaName]: !prev[armadaName],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Search Bar */}
      <section className="glossy-panel rounded-2xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Daftar Surat Jalan (DO)
              </h2>
              <p className="text-xs text-zinc-400">
                Manifest Surat Jalan & Dokumen Pengiriman yang Dibawa Armada
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl glossy-input focus-within:border-blue-500/50 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all w-full sm:w-80">
            <Search className="text-zinc-500 w-4 h-4 shrink-0" />
            <input
              type="text"
              placeholder="Cari No. Surat Jalan / Toko / Driver..."
              className="bg-transparent border-none text-white placeholder:text-zinc-500 w-full focus:outline-none text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-zinc-400 hover:text-white px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Armada Filter Chips (Simpel & Cepat) */}
        {allArmadas.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase shrink-0 mr-1 flex items-center gap-1">
              <Truck className="w-3 h-3" /> Armada:
            </span>
            <button
              onClick={() => setSelectedArmada('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedArmada === 'all'
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              Semua Armada ({data.length})
            </button>
            {allArmadas.map((armada) => {
              const isSelected = selectedArmada === armada;
              const count = data.filter((d) => d.armada?.trim() === armada).length;
              return (
                <button
                  key={armada}
                  onClick={() => setSelectedArmada(armada)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {armada} ({count})
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Manifest Surat Jalan Grouped by Armada */}
      {groupedByArmada.length === 0 ? (
        <div className="glossy-panel p-10 rounded-2xl text-center text-zinc-500 text-xs">
          Tidak ada Surat Jalan yang sesuai dengan pencarian atau filter.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByArmada.map((group) => {
            const isCollapsed = Boolean(collapsedArmadas[group.armada]);
            return (
              <div
                key={group.armada}
                className="glossy-panel rounded-2xl overflow-hidden shadow-xl transition-all"
              >
                {/* Group Header: Armada & Driver Information */}
                <div
                  onClick={() => toggleArmada(group.armada)}
                  className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-black/60 border-b border-white/[0.08] flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)] shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white tracking-wide">
                          {group.armada}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/25 text-blue-300 text-[10px] font-bold">
                          {group.items.length} Surat Jalan
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 truncate">
                        <span className="text-zinc-300 font-medium">Driver: {group.driver}</span>
                        {group.kenek && group.kenek !== '-' && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span>Kenek: {group.kenek}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {group.totalCbm > 0 && (
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-zinc-500 uppercase font-semibold">Total CBM</div>
                        <div className="text-xs font-bold text-amber-400 font-mono">
                          {group.totalCbm.toFixed(3)} m³
                        </div>
                      </div>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Surat Jalan Items List */}
                {!isCollapsed && (
                  <div className="p-3 sm:p-4 space-y-2.5">
                    {group.items.map((sj, idx) => (
                      <div
                        key={`${sj.noOrder}-${idx}`}
                        className="glossy-card glossy-card-hover p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        {/* Left: Surat Jalan Number & Destination */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-400/30 text-blue-300 font-mono text-[11px] font-bold tracking-tight">
                              📄 {sj.noOrder}
                            </span>
                            {sj.noReceive && (
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400 font-mono text-[10px]">
                                RCV: {sj.noReceive}
                              </span>
                            )}
                            {sj.cbm && sj.cbm !== '0' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[10px] font-semibold">
                                {parseFloat(sj.cbm.toString()).toFixed(3)} m³
                              </span>
                            )}
                          </div>

                          {/* Customer & Address */}
                          <div className="pt-0.5">
                            <div className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                              {sj.name || 'Tujuan Pengiriman'}
                            </div>
                            {sj.address && (
                              <div className="text-[11px] text-zinc-400 flex items-start gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                                <span className="line-clamp-2 leading-relaxed">{sj.address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions / Info Badge */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.05]">
                          {sj.reqShipDate && (
                            <span className="text-[10px] text-zinc-400 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.06]">
                              Tgl: {sj.reqShipDate}
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Siap Kirim
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
