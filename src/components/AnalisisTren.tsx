import { useState, useMemo } from 'react';
import { HubKediriData } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { Calendar, TrendingUp, Package, MapPin, Layers, Box } from 'lucide-react';

interface AnalisisTrenProps {
  data: HubKediriData[];
}

export default function AnalisisTren({ data = [] }: AnalisisTrenProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | '7days' | '30days'>('all');

  // Filter and sort chronologically
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    let list = [...data].filter(d => Boolean(d && d.tanggal));

    // Sort ascending by ISO date
    list.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));

    if (activeFilter === '7days') {
      list = list.slice(-7);
    } else if (activeFilter === '30days') {
      list = list.slice(-30);
    } else if (startDate || endDate) {
      list = list.filter(d => {
        const t = d.tanggal || '';
        const matchStart = !startDate || t >= startDate;
        const matchEnd = !endDate || t <= endDate;
        return matchStart && matchEnd;
      });
    }

    return list;
  }, [data, startDate, endDate, activeFilter]);

  // Compute KPI summaries in a single-pass O(N) traversal
  const kpis = useMemo(() => {
    let totalDo = 0;
    let totalCbm = 0;
    let totalTitik = 0;
    let totalSts = 0;
    let totalGrw = 0;
    let totalCust = 0;

    for (let i = 0; i < filteredData.length; i++) {
      const d = filteredData[i];
      totalDo += Number(d.totalDo) || 0;
      totalCbm += Number(d.cbm) || 0;
      totalTitik += Number(d.titikPengiriman) || 0;
      totalSts += Number(d.sts) || 0;
      totalGrw += Number(d.grw) || 0;
      totalCust += Number(d.cust) || 0;
    }

    const totalDays = filteredData.length || 1;
    const avgCbmPerTitik = totalTitik > 0 ? (totalCbm / totalTitik).toFixed(2) : '0.00';
    const avgDoPerHari = (totalDo / totalDays).toFixed(1);

    return {
      totalDo,
      totalCbm: Number(totalCbm.toFixed(2)),
      totalTitik,
      avgCbmPerTitik,
      avgDoPerHari,
      totalSts,
      totalGrw,
      totalCust,
    };
  }, [filteredData]);

  // Format chart data with clean date labels
  const chartData = useMemo(() => {
    return filteredData.map(d => {
      let displayDate = d.tanggal;
      if (d.tanggal && d.tanggal.includes('-')) {
        const parts = d.tanggal.split('-');
        if (parts.length === 3) {
          displayDate = `${parts[2]}/${parts[1]}`;
        }
      }
      return {
        rawDate: d.tanggal,
        date: displayDate,
        totalDo: Number(d.totalDo) || 0,
        cbm: Number(Number(d.cbm || 0).toFixed(2)),
        titik: Number(d.titikPengiriman) || 0,
        sts: Number(d.sts) || 0,
        grw: Number(d.grw) || 0,
        cust: Number(d.cust) || 0,
        ujp: Number(d.ujp) || 0,
      };
    });
  }, [filteredData]);

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header & Filter Card */}
      <div className="glossy-panel rounded-2xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Analisis Tren & Performa Hub Kediri
              </h2>
              <p className="text-xs text-zinc-400">
                Visualisasi tren harian volume DO, kapasitas CBM, dan komposisi segmen
              </p>
            </div>
          </div>

          {/* Quick filter tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activeFilter === 'all' && !startDate && !endDate
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)] border border-blue-400/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setActiveFilter('7days');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activeFilter === '7days'
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)] border border-blue-400/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => {
                setActiveFilter('30days');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activeFilter === '30days'
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)] border border-blue-400/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              30 Hari
            </button>
          </div>
        </div>

        {/* Date range pickers */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 glossy-input px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="text-zinc-400 shrink-0 font-medium">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setActiveFilter('all');
              }}
              className="bg-transparent text-white focus:outline-none w-full text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-2 glossy-input px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="text-zinc-400 shrink-0 font-medium">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setActiveFilter('all');
              }}
              className="bg-transparent text-white focus:outline-none w-full text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glossy-card glossy-card-hover p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-400/25 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold truncate">
              Total Volume DO
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5 tracking-tight">
              {kpis.totalDo.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="glossy-card glossy-card-hover p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Box className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold truncate">
              Total Volume CBM
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-amber-400 mt-0.5 tracking-tight">
              {kpis.totalCbm.toLocaleString('id-ID')} <span className="text-xs font-normal text-zinc-400">m³</span>
            </div>
          </div>
        </div>

        <div className="glossy-card glossy-card-hover p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold truncate">
              Total Titik Drop
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5 tracking-tight">
              {kpis.totalTitik.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="glossy-card glossy-card-hover p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-400/25 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold truncate">
              Rata-rata CBM / Drop
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-purple-300 mt-0.5 tracking-tight">
              {kpis.avgCbmPerTitik} <span className="text-xs font-normal text-zinc-400">m³</span>
            </div>
            <div className="text-[9px] text-zinc-400 truncate mt-0.5 font-medium">
              Avg {kpis.avgDoPerHari} DO / hari aktif
            </div>
          </div>
        </div>
      </div>

      {/* Chart 1: Tren Pengiriman Harian (Glossy Obsidian Spline Area Chart) */}
      <div className="glossy-panel rounded-2xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              Tren Pengiriman Harian
            </h3>
            <p className="text-xs text-zinc-400">
              Perbandingan harian Total DO, Kapasitas CBM, dan Titik Pengiriman
            </p>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full min-w-0">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Tidak ada data yang sesuai dengan rentang tanggal yang dipilih
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="glossyGradientDo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="glossyGradientCbm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="glossyGradientTitik" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  dy={5}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(12, 12, 16, 0.95)', 
                    borderColor: 'rgba(255, 255, 255, 0.12)', 
                    borderRadius: '16px', 
                    color: '#fff',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(59, 130, 246, 0.15)',
                    backdropFilter: 'blur(12px)'
                  }} 
                  labelStyle={{ fontWeight: 'bold', color: '#a1a1aa', marginBottom: '6px', fontSize: '11px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalDo" 
                  name="Total DO" 
                  stroke="#3B82F6" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#glossyGradientDo)" 
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  dot={{ r: 2.5, strokeWidth: 0, fill: '#3B82F6' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cbm" 
                  name="CBM" 
                  stroke="#F59E0B" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#glossyGradientCbm)" 
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  dot={{ r: 2.5, strokeWidth: 0, fill: '#F59E0B' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="titik" 
                  name="Titik Pengiriman" 
                  stroke="#10B981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#glossyGradientTitik)" 
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  dot={{ r: 2.5, strokeWidth: 0, fill: '#10B981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Komposisi Segmen (STS, GRW, CUST) */}
      <div className="glossy-panel rounded-2xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
              Komposisi Segmen Pengiriman
            </h3>
            <p className="text-xs text-zinc-400">
              Distribusi pengiriman berdasarkan segmen STS, GRW, dan Customer
            </p>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full min-w-0">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              Tidak ada data yang sesuai
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  dy={5}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(12, 12, 16, 0.95)', 
                    borderColor: 'rgba(255, 255, 255, 0.12)', 
                    borderRadius: '16px', 
                    color: '#fff',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(12px)'
                  }} 
                  labelStyle={{ fontWeight: 'bold', color: '#a1a1aa', marginBottom: '6px', fontSize: '11px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sts" 
                  name="STS" 
                  stroke="#38BDF8" 
                  strokeWidth={2.5} 
                  dot={{ r: 2.5, strokeWidth: 0, fill: '#38BDF8' }}
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="grw" 
                  name="GRW" 
                  stroke="#A855F7" 
                  strokeWidth={2.5} 
                  dot={{ r: 2.5, strokeWidth: 0, fill: '#A855F7' }}
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cust" 
                  name="CUST" 
                  stroke="#F97316" 
                  strokeWidth={2.5} 
                  dot={{ r: 2.5, strokeWidth: 0, fill: '#F97316' }}
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
