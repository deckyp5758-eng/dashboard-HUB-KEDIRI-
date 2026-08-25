/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Loader2, LayoutDashboard, Truck, Users, MapPin, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OnDutyPanel from './components/OnDutyPanel';
import ShippingPanel from './components/ShippingPanel';
import AnalisisTren from './components/AnalisisTren';
import CoverageMapPanel from './components/CoverageMapPanel';
import { Personil, Pengiriman, HubKediriData } from './types';
import { db } from './lib/firebase';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';
import hinoPortraitImg from './assets/images/hino_portrait_decky_1787197718497.jpg';
import hinoDesktopImg from './assets/images/hino_desktop_decky_1787197729757.jpg';
import DAppLogo from './components/DAppLogo';

const SPREADSHEET_ID = "1nywoI4jT7ih12mdeRLFqgld6HGLdDIaJDBuiKvaX6o8";

// Hoisted pure helper functions to avoid recreating on each render / iteration
function formatPhone(phone: any): string {
  if (!phone) return "";
  const p = phone.toString().trim();
  if (p.startsWith("0")) return "+62" + p.slice(1);
  if (p.startsWith("62")) return "+" + p;
  if (!p.startsWith("+")) return "+62" + p;
  return p;
}

function parseCbmValue(val: any): string {
  if (val === undefined || val === null) return "0";
  let str = val.toString().trim().replace(/Rp/gi, '').replace(/\s/g, '');
  if (!str || str === '-') return "0";

  // If string contains both '.' and ',' (e.g. 1.234,56 or 1,234.56)
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // e.g. 1.234,56 -> thousand separator is '.', decimal is ','
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. 1,234.56 -> thousand separator is ',', decimal is '.'
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Standard Indonesian / European decimal with comma (e.g. "15,67" -> "15.67")
    str = str.replace(',', '.');
  }
  
  const n = parseFloat(str);
  return isNaN(n) ? "0" : n.toString();
}

function parseNumber(val: any, isCurrency = false): number {
  if (val === undefined || val === null) return 0;
  const str = val.toString().trim().replace(/Rp/gi, '').replace(/\s/g, '');
  if (!str || str === '-') return 0;

  // For currency/thousands like 360.900
  if (isCurrency || str.includes(',')) {
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  // Standard dot decimal or plain integer (e.g. 15.67 or 49)
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

async function fetchWithRetry(url: string, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personil, setPersonil] = useState<Personil[]>([]);
  const [pengiriman, setPengiriman] = useState<Pengiriman[]>([]);
  const [analisisData, setAnalisisData] = useState<HubKediriData[]>([]);
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'pengiriman' | 'analisisTren' | 'profil'>('dashboard');

  // Swipe Gestures for tab switching
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const minSwipeDistance = 60; // minimum distance in px to register swipe

  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Skip if swiping inside leaflet maps, charts, scroll containers, sliders, or form inputs
    if (
      target.closest('.leaflet-container') || 
      target.closest('.recharts-responsive-container') || 
      target.closest('[data-no-swipe="true"]') || 
      target.closest('input') || 
      target.closest('select') || 
      target.closest('button') ||
      target.closest('canvas') ||
      target.closest('.no-swipe')
    ) {
      return;
    }
    setTouchEnd(null);
    setTouchEndY(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) {
      setTouchEnd(e.targetTouches[0].clientX);
      setTouchEndY(e.targetTouches[0].clientY);
    }
  };

  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null || touchStartY === null || touchEndY === null) return;
    
    const distanceX = touchStart - touchEnd;
    const distanceY = touchStartY - touchEndY;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    
    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      const screens = ['dashboard', 'pengiriman', 'analisisTren', 'profil'] as const;
      const currentIndex = screens.indexOf(activeScreen);
      
      if (distanceX > 0) {
        // Swiped left -> Go to Next Tab
        if (currentIndex < screens.length - 1) {
          const nextScreen = screens[currentIndex + 1];
          setSwipeDirection('left');
          setActiveScreen(nextScreen);
        }
      } else {
        // Swiped right -> Go to Previous Tab
        if (currentIndex > 0) {
          const nextScreen = screens[currentIndex - 1];
          setSwipeDirection('right');
          setActiveScreen(nextScreen);
        }
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setTouchStartY(null);
    setTouchEndY(null);
  };

  const slideVariants = {
    enter: (direction: 'left' | 'right' | null) => ({
      x: direction === 'left' ? '100%' : direction === 'right' ? '-100%' : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 35 },
        opacity: { duration: 0.15 }
      }
    },
    exit: (direction: 'left' | 'right' | null) => ({
      x: direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 0,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 35 },
        opacity: { duration: 0.15 }
      }
    })
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }
    try {
      setError(null);
      const metaRes = await fetchWithRetry(`/api/sheets/${SPREADSHEET_ID}/metadata`);
      const metaData = await metaRes.json();
      const sheets = metaData.sheets;
      const personilSheet = sheets.find((s: any) => s.properties.sheetId === 1831064929)?.properties.title;
      const pengirimanSheet = sheets.find((s: any) => s.properties.sheetId === 1375575560)?.properties.title;
      const analisisSheet = sheets.find((s: any) => s.properties.sheetId === 774474728)?.properties.title;

      const [personilRes, pengirimanRes, analisisRes] = await Promise.all([
        fetchWithRetry(`/api/sheets/${SPREADSHEET_ID}/${personilSheet}!A1:AZ100?t=${Date.now()}`),
        fetchWithRetry(`/api/sheets/${SPREADSHEET_ID}/${pengirimanSheet}!A2:W100?t=${Date.now()}`),
        analisisSheet ? fetchWithRetry(`/api/sheets/${SPREADSHEET_ID}/${analisisSheet}!A2:H100?t=${Date.now()}`) : Promise.resolve(null)
      ]);
      
      const personilData = await personilRes.json();
      const pengirimanData = await pengirimanRes.json();
      const analisisRaw = analisisRes ? await analisisRes.json() : { values: [] };
      
      if (personilData.values) {
        const [headerRow, ...dataRows] = personilData.values;
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth(); // 0-based index
        const year = today.getFullYear();

        const idMonthsLong = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const idMonthsShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const idMonthsShortAlt = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
        const enMonthsLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const enMonthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Generate multiple potential formats for matching today's date column
        const searchTargets = [
          `${day} ${idMonthsLong[month]}`, // e.g. "22 Agustus"
          `${day} ${idMonthsShort[month]}`, // e.g. "22 Agu"
          `${day} ${idMonthsShortAlt[month]}`, // e.g. "22 Agt"
          `${day} ${enMonthsLong[month]}`, // e.g. "22 August"
          `${day} ${enMonthsShort[month]}`, // e.g. "22 Aug"
          `${day}-${idMonthsShort[month]}`, // e.g. "22-Agu"
          `${day}-${idMonthsShortAlt[month]}`, // e.g. "22-Agt"
          `${day}-${enMonthsShort[month]}`, // e.g. "22-Aug"
          `${day}/${month + 1}`, // e.g. "22/8"
          `${day}/${(month + 1).toString().padStart(2, '0')}`, // e.g. "22/08"
          `${day}/${(month + 1).toString().padStart(2, '0')}/${year}`, // e.g. "22/08/2026"
          `${day}/${(month + 1).toString().padStart(2, '0')}/${year.toString().slice(-2)}`, // e.g. "22/08/26"
          `${day}/${month + 1}/${year}`, // e.g. "22/8/2026"
          `${day}/${month + 1}/${year.toString().slice(-2)}`, // e.g. "22/8/26"
          `${(month + 1).toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`, // e.g. "08/22"
          `${(month + 1).toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`, // e.g. "08/22/2026"
          `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` // e.g. "2026-08-22"
        ].map(t => t.toLowerCase());

        // Search the header row starting from index 4 (Column E, where date columns begin)
        let dateColIndex = -1;
        if (headerRow && headerRow.length > 4) {
          const todayDayStr = day.toString();
          const todayDayPaddedStr = day.toString().padStart(2, '0');

          // PHASE 1: Priority Match for Solution 1 (Exact Day Number e.g. "23" or "023" or "23.0")
          for (let i = 4; i < headerRow.length; i++) {
            const cell = (headerRow[i] || '').toString().trim();
            if (!cell) continue;

            // Match exact number (e.g., cell is "23") or float format from spreadsheet numeric output (e.g., "23.0")
            const cleanCellNum = cell.replace(/\.0$/, '');
            if (cleanCellNum === todayDayStr || cleanCellNum === todayDayPaddedStr) {
              dateColIndex = i;
              break;
            }
          }

          // PHASE 2: Fallback Match for longer date strings (e.g. "23 Agustus", "23-Agu")
          if (dateColIndex === -1) {
            for (let i = 4; i < headerRow.length; i++) {
              const cell = (headerRow[i] || '').toString().toLowerCase().trim();
              if (!cell) continue;

              const isMatch = searchTargets.some(target => 
                cell === target || cell.includes(target)
              );
              if (isMatch) {
                dateColIndex = i;
                break;
              }
            }
          }

          // PHASE 3: Ultimate split-part fallback
          if (dateColIndex === -1) {
            for (let i = 4; i < headerRow.length; i++) {
              const cell = (headerRow[i] || '').toString().toLowerCase().trim();
              if (!cell) continue;
              
              const parts = cell.split(/[\s/\-_]+/);
              if (parts.includes(todayDayStr) || parts.some(p => p.startsWith(todayDayStr))) {
                dateColIndex = i;
                break;
              }
            }
          }
        }

        const allPersonil = dataRows
          .filter((row: any) => row && row[1]) // Ensure they have a name
          .map((row: any) => ({
            nip: (row[0] || '').toString().trim(),
            nama: (row[1] || '').toString().trim(),
            jabatan: (row[2] || 'STAFF').toString().trim(),
            wa: formatPhone(row[3]),
            jadwal: dateColIndex !== -1 ? (row[dateColIndex] || '').toString().trim() : ''
          }));

        // Strict filter: only 'M' or 'MD' shift codes if column matches today's date
        const activePersonil = allPersonil.filter((p: Personil) => {
          if (dateColIndex === -1) {
            return false; // If date column not found, we don't display anyone (no fallback/manipulation)
          }
          const j = p.jadwal.toUpperCase().trim();
          return j === 'M' || j === 'MD';
        });

        setPersonil(activePersonil);
      }

      if (pengirimanData.values) {
        let existingOrders = new Map<string, string>();
        try {
          const firestoreQuery = query(collection(db, 'pengiriman'));
          const querySnapshot = await getDocs(firestoreQuery);
          existingOrders = new Map(querySnapshot.docs.map(doc => [doc.data().noOrder, doc.data().createdAt]));
        } catch (e) {
          console.warn("Firestore sync warning:", e);
        }

        const parsedPengiriman: Pengiriman[] = pengirimanData.values.map((row: any) => {
          const noOrder = (row[0] || "").toString();
          return {
            noOrder,
            noReceive: (row[1] || "").toString(), 
            address: (row[4] || "").toString(),
            name: (row[8] || "").toString(), 
            telp: formatPhone(row[14]), 
            reqShipDate: (row[17] || "").toString(),
            armada: (row[20] || "").toString(), 
            driver: (row[21] || "").toString(), 
            kenek: (row[22] || "").toString(),
            cbm: parseCbmValue(row[15]),
            createdAt: existingOrders.get(noOrder) || new Date().toISOString()
          };
        });

        setPengiriman(parsedPengiriman);

        // Background sync new orders only
        const newOrders = parsedPengiriman.filter(p => p.noOrder && !existingOrders.has(p.noOrder));
        if (newOrders.length > 0) {
          Promise.allSettled(newOrders.map(p => addDoc(collection(db, 'pengiriman'), p))).catch(err => {
            console.warn("Error adding orders to firestore:", err);
          });
        }
      }
      
      if (analisisRaw.values) {
          setAnalisisData(analisisRaw.values.map((row: any) => {
            const rawTanggal = (row[0] || "").toString().trim();
            let formattedTanggal = rawTanggal;
            if (rawTanggal.includes('/')) {
              const parts = rawTanggal.split('/');
              if (parts.length === 3) {
                const d = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                formattedTanggal = `${y}-${m}-${d}`;
              }
            }

            return {
              tanggal: formattedTanggal,
              sts: parseNumber(row[1]),
              grw: parseNumber(row[2]),
              cust: parseNumber(row[3]),
              totalDo: parseNumber(row[4]),
              ujp: parseNumber(row[5], true),
              titikPengiriman: parseNumber(row[6]),
              cbm: parseNumber(row[7]),
            };
          }));
      }

      // Record fresh timestamp
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setLastUpdated(timeStr);
      setError(null);
    } catch (error) { 
      console.error("Error:", error); 
      setError("Gagal memuat data. Silakan periksa koneksi atau coba lagi nanti.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="relative min-h-[100dvh] bg-[#090b10] flex flex-col items-center justify-between text-zinc-100 overflow-hidden select-none">
      {/* Background Graphic Illustration (Responsive for Mobile & Desktop Widescreen) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#0c1017]">
        <picture className="w-full h-full block">
          <source 
            media="(min-width: 768px)" 
            srcSet={hinoDesktopImg} 
          />
          <img
            src={hinoPortraitImg}
            alt="Hino Dutro Informa HUB Kediri Loading"
            className="w-full h-full object-cover object-center scale-[1.03]"
            loading="eager"
            decoding="sync"
          />
        </picture>
        {/* Soft Vignette and Gradient Overlay for optimal readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07090e]/90 via-[#07090e]/15 to-[#07090e]/95 pointer-events-none"></div>
        <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-50"></div>
      </div>

      {/* Spacing for layout balance */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 pb-24 sm:pb-8">
        {/* Centered Brand Loading Section */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 py-7 sm:px-8 sm:py-9 max-w-[22rem] w-full bg-[#090b10]/80 backdrop-blur-xl rounded-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.7)] select-none animate-[fadeIn_0.5s_ease-out]">
          
          {/* Logo DApp */}
          <div className="relative mb-5 flex h-36 sm:h-40 w-full max-w-[180px] sm:max-w-[210px] items-center justify-center drop-shadow-[0_4px_16px_rgba(0,240,255,0.25)]">
            <DAppLogo className="h-full w-full animate-pulse duration-1000" />
          </div>
          
          {/* Nama Aplikasi Pelanggan / Platform */}
          <h2 className="text-[17px] sm:text-xl font-extrabold text-white tracking-[0.16em] uppercase leading-tight">
            HUB KEDIRI LOGISTICS
          </h2>

          {/* Loading Spinner */}
          <div className="mt-7 flex flex-col items-center gap-2">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-cyan-400/25 blur-md animate-pulse"></div>
              <svg 
                className="w-9 h-9 animate-wheel-spin drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
                viewBox="0 0 100 100" 
                fill="none"
              >
                <circle cx="50" cy="50" r="44" stroke="#0ea5e9" strokeWidth="6" strokeDasharray="16 8" strokeLinecap="round" opacity="0.9" />
                <circle cx="50" cy="50" r="32" stroke="#38bdf8" strokeWidth="4" />
                <circle cx="50" cy="50" r="10" fill="#0284c7" stroke="#e0f2fe" strokeWidth="3" />
                <line x1="50" y1="18" x2="50" y2="40" stroke="#bae6fd" strokeWidth="4" strokeLinecap="round" />
                <line x1="50" y1="60" x2="50" y2="82" stroke="#bae6fd" strokeWidth="4" strokeLinecap="round" />
                <line x1="18" y1="50" x2="40" y2="50" stroke="#bae6fd" strokeWidth="4" strokeLinecap="round" />
                <line x1="60" y1="50" x2="82" y2="50" stroke="#bae6fd" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-300 uppercase">
              MEMUAT DATA...
            </span>
          </div>
        </div>
      </div>

      {/* Floating Dynamic Fleet Badge at Bottom */}
      <footer className="relative z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-10 px-4 w-full flex flex-col items-center">
        <div className="glossy-panel backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 bg-black/50 shadow-2xl flex items-center gap-3 max-w-sm w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <div className="text-left">
              <div className="text-[11px] font-bold text-white tracking-[0.04em]">HINO DUTRO • INFORMA</div>
              <div className="text-[9px] font-mono text-zinc-300">HUB KEDIRI LOGISTICS</div>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-200 border border-blue-400/30">
            JALUR ON-ROUTE
          </span>
        </div>
      </footer>
    </div>
  );

  if (error) return (
    <div className="min-h-[100dvh] bg-[#07080b] flex items-center justify-center p-4 text-center">
      <div className="glossy-panel p-6 rounded-2xl max-w-sm space-y-4 text-zinc-300 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
        <p className="text-sm text-red-400 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-b from-red-500 to-red-700 shadow-lg shadow-red-500/20 border border-red-400/30 hover:brightness-110 active:scale-98 transition-all"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 relative overflow-x-hidden">
      {/* Uiverse Geometric Pattern (Biru Dongker / Navy & Deep Black) */}
      <div className="fixed inset-0 pointer-events-none z-0 uiverse-navy-bg opacity-75"></div>
      
      {/* Ambient Vignette & Gradient Overlays for Depth and Contrast */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/15 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 -right-40 w-[400px] h-[300px] bg-sky-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Glossy Obsidian Top Header */}
      <header className="sticky top-0 z-40 bg-[#090a0f]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3 flex justify-between items-center shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-blue-500/20 to-blue-600/10 border border-blue-400/30 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.25)]">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wider flex items-center gap-2">
              HUB KEDIRI
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium">
              Monitoring Operasional Logistik
            </p>
          </div>
        </div>

        {/* Refresh and Branded Header Actions */}
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="hidden sm:flex flex-col items-end justify-center">
              <span className="text-[8px] font-bold text-zinc-500 tracking-widest uppercase">TERAKHIR DIPERBARUI</span>
              <span className="text-[10px] font-semibold text-zinc-300 tracking-wide">{lastUpdated}</span>
            </div>
          )}
          
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
              isRefreshing
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-white/5 hover:bg-white/10 active:scale-95 border-white/10 hover:border-white/20 text-zinc-300 hover:text-white'
            }`}
            title="Perbarui Data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 flex items-center justify-center text-[10px] font-bold text-zinc-200 shadow-inner">
            HK
          </div>
        </div>
      </header>

      {/* Main Content Area with Touch Swipe Gestures */}
      <main 
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-x-hidden overflow-y-auto scrollbar-hide pb-[calc(7rem+env(safe-area-inset-bottom))] relative z-10 flex flex-col justify-between"
      >
        <div className="w-full overflow-hidden">
          <motion.div 
            className="flex will-change-transform"
            style={{ width: '400%' }}
            animate={{ x: `-${['dashboard', 'pengiriman', 'analisisTren', 'profil'].indexOf(activeScreen) * 25}%` }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            {/* Dashboard Panel */}
            <div 
              className="w-1/4 flex-shrink-0 px-1 transition-opacity duration-300"
              style={{
                height: activeScreen === 'dashboard' ? 'auto' : '0px',
                overflow: activeScreen === 'dashboard' ? 'visible' : 'hidden',
                visibility: activeScreen === 'dashboard' ? 'visible' : 'hidden',
                opacity: activeScreen === 'dashboard' ? 1 : 0,
              }}
            >
              <div className="p-4 sm:p-5 space-y-5 max-w-7xl mx-auto">
                <OnDutyPanel data={personil} />
              </div>
            </div>

            {/* Shipping Panel */}
            <div 
              className="w-1/4 flex-shrink-0 px-1 transition-opacity duration-300"
              style={{
                height: activeScreen === 'pengiriman' ? 'auto' : '0px',
                overflow: activeScreen === 'pengiriman' ? 'visible' : 'hidden',
                visibility: activeScreen === 'pengiriman' ? 'visible' : 'hidden',
                opacity: activeScreen === 'pengiriman' ? 1 : 0,
              }}
            >
              <div className="p-4 sm:p-5 max-w-7xl mx-auto">
                <ShippingPanel data={pengiriman} />
              </div>
            </div>

            {/* Analisis Tren */}
            <div 
              className="w-1/4 flex-shrink-0 px-1 transition-opacity duration-300"
              style={{
                height: activeScreen === 'analisisTren' ? 'auto' : '0px',
                overflow: activeScreen === 'analisisTren' ? 'visible' : 'hidden',
                visibility: activeScreen === 'analisisTren' ? 'visible' : 'hidden',
                opacity: activeScreen === 'analisisTren' ? 1 : 0,
              }}
            >
              <div className="p-1 sm:p-2 max-w-7xl mx-auto">
                <AnalisisTren data={analisisData} />
              </div>
            </div>

            {/* Coverage Map Panel */}
            <div 
              className="w-1/4 flex-shrink-0 px-1 transition-opacity duration-300"
              style={{
                height: activeScreen === 'profil' ? 'auto' : '0px',
                overflow: activeScreen === 'profil' ? 'visible' : 'hidden',
                visibility: activeScreen === 'profil' ? 'visible' : 'hidden',
                opacity: activeScreen === 'profil' ? 1 : 0,
              }}
            >
              <div className="p-4 sm:p-5 max-w-7xl mx-auto">
                <CoverageMapPanel />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Co-Branded Footer */}
        <footer className="mt-10 mb-5 px-4 py-5 sm:px-6 border-t border-white/[0.08] bg-[#0c0d15]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left max-w-7xl mx-auto w-[calc(100%-1rem)] sm:w-full rounded-2xl select-none">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wider flex items-center justify-center sm:justify-start">
              HUB KEDIRI LOGISTICS
            </h3>
          </div>
          <div className="flex items-center">
            <div className="h-11 px-3 py-1.5 bg-black/50 rounded-xl flex items-center justify-center border border-white/10 shadow-inner backdrop-blur-sm">
              <DAppLogo className="h-7 w-auto" />
            </div>
          </div>
        </footer>
      </main>

      {/* Glossy Obsidian Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#090a0f]/95 backdrop-blur-2xl border-t border-white/[0.1] px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around items-center z-50 shadow-[0_-10px_35px_rgba(0,0,0,0.8)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'pengiriman', icon: Truck, label: 'Pengiriman' },
          { id: 'analisisTren', icon: Users, label: 'Analisis Tren' },
          { id: 'profil', icon: MapPin, label: 'Peta Wilayah' },
        ].map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (activeScreen !== item.id) {
                  const screens = ['dashboard', 'pengiriman', 'analisisTren', 'profil'] as const;
                  const oldIdx = screens.indexOf(activeScreen);
                  const newIdx = screens.indexOf(item.id as any);
                  setSwipeDirection(newIdx > oldIdx ? 'left' : 'right');
                  setActiveScreen(item.id as any);
                }
              }}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-2.5 sm:px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-blue-600/5 rounded-xl border border-blue-400/25 shadow-[0_0_15px_rgba(59,130,246,0.25)] -z-10"></div>
              )}
              <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-400' : ''}`} />
              <span className={`text-[10px] sm:text-[11px] tracking-tight ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
