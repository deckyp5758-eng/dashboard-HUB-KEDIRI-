import { useState, useMemo } from 'react';
import { Users, Phone, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Personil } from '../types';

interface OnDutyPanelProps {
  data: Personil[];
}

const ROLES = ['SPV', 'STAFF', 'DRIVER', 'KENEK'] as const;

function getRoleColor(role: string): string {
  switch (role) {
    case 'SPV': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'STAFF': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'DRIVER': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'KENEK': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
}

export default function OnDutyPanel({ data }: OnDutyPanelProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(true);

  // Group staff once per data change instead of filtering 4 times during render
  const groupedStaff = useMemo(() => {
    const map = new Map<string, Personil[]>();
    ROLES.forEach(r => map.set(r, []));

    data.forEach(p => {
      const role = p.jabatan?.toUpperCase() || 'STAFF';
      if (map.has(role)) {
        map.get(role)!.push(p);
      } else {
        const others = map.get('STAFF') || [];
        others.push(p);
        map.set('STAFF', others);
      }
    });

    return ROLES.map(role => ({
      jabatan: role,
      list: map.get(role) || []
    })).filter(g => g.list.length > 0);
  }, [data]);

  return (
    <aside className="glossy-panel rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      {/* Glossy Header with specular top highlight */}
      <div 
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        className="p-4 sm:p-5 border-b border-white/[0.08] flex justify-between items-center cursor-pointer md:cursor-default hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-wider text-zinc-300 font-bold flex items-center gap-2">
              On Duty Today
            </h2>
            <p className="text-[10px] text-zinc-500">Personil Aktif Bertugas di Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {data.length} Active
          </span>
          {/* Chevron for mobile toggling */}
          <div className="md:hidden w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
            {isMobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>
      
      {/* Staff List container */}
      <div className={`p-3 sm:p-4 space-y-4 ${isMobileExpanded ? 'block' : 'hidden md:block'}`}>
        {groupedStaff.length === 0 ? (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-zinc-500 mb-3 shadow-inner">
              <Users className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-xs font-bold text-zinc-300">Tidak Ada Personil Aktif Hari Ini</p>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
              Jadwal dinas aktif (M atau MD) belum terdaftar untuk tanggal hari ini di Google Sheets.
            </p>
          </div>
        ) : (
          groupedStaff.map(({ jabatan, list }) => (
            <div key={jabatan} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase ${getRoleColor(jabatan)}`}>
                  {jabatan} ({list.length})
                </span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {list.map((p) => (
                  <div 
                    key={p.nip || p.nama} 
                    className="glossy-card glossy-card-hover p-3 rounded-xl flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 group-hover:border-blue-400/30 group-hover:text-white transition-colors shrink-0">
                        {p.nama.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-white truncate">
                          {p.nama}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                          <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>Shift {p.jadwal || 'Reguler'}</span>
                          {p.nip && <span className="text-zinc-600 font-mono">#{p.nip}</span>}
                        </div>
                      </div>
                    </div>

                    {p.wa && (
                      <a 
                        href={`https://wa.me/${p.wa}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] shrink-0"
                        title="Hubungi via WhatsApp"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
