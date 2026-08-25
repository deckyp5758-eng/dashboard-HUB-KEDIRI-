import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  ExternalLink, 
  Building2, 
  Radio, 
  ZoomIn, 
  ZoomOut, 
  LocateFixed 
} from 'lucide-react';

interface CityCoverage {
  id: string;
  name: string;
  category: 'daily' | 'perdin';
  schedule: string;
  scheduleDay?: 'Senin' | 'Rabu' | "Jum'at";
  distance: string;
  travelTime: string;
  direction: string;
  corridor: string;
  lat: number;
  lng: number;
  radiusKm: number;
  description: string;
  isHub?: boolean;
}

// Exact HUB KEDIRI Coordinates & Location
const HUB_INFO = {
  name: 'WH HCI KEDIRI',
  address: 'Jl. Kertosono - Tulungagung No.134, Putih, Kec. Gampengrejo, Kabupaten Kediri, Jawa Timur 64182',
  lat: -7.7552,
  lng: 112.0315,
  mapsUrl: 'https://maps.app.goo.gl/c1QqeuUehuHLxX4y9',
  phone: '0812-3456-7890',
};

const COVERAGE_CITIES: CityCoverage[] = [
  {
    id: 'hub_kediri',
    name: 'WH HCI KEDIRI (Pusat Hub)',
    category: 'daily',
    schedule: 'Pusat Distribusi & Pergudangan Utama',
    distance: '0 km (Titik Asal)',
    travelTime: 'Depo Pusat',
    direction: 'Pusat Operasional Hub',
    corridor: 'Jl. Kertosono - Tulungagung No.134, Putih, Gampengrejo',
    lat: HUB_INFO.lat,
    lng: HUB_INFO.lng,
    radiusKm: 12,
    description: HUB_INFO.address,
    isHub: true,
  },
  {
    id: 'kediri_area',
    name: 'Kediri (Kota & Kab)',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 8 - 25 km',
    travelTime: '± 15 - 35 Menit',
    direction: 'Lokal Kediri Raya',
    corridor: 'Jl. Raya Kediri-Kertosono ➔ Kota Kediri / Pare / Gurah / Kras',
    lat: -7.8167,
    lng: 112.0167,
    radiusKm: 16,
    description: 'Wilayah inti distribusi harian Kota Kediri, Pare, Grogol, Gurah, & sekitarnya.',
  },
  {
    id: 'nganjuk',
    name: 'Nganjuk',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 32 - 36 km',
    travelTime: '± 45 - 60 Menit',
    direction: 'Utara',
    corridor: 'Gampengrejo ➔ Papar ➔ Purwoasri ➔ Kertosono ➔ Baron ➔ Nganjuk Kota',
    lat: -7.6053,
    lng: 111.9038,
    radiusKm: 15,
    description: 'Jalur harian reguler via Kertosono - Sukomoro - Nganjuk Kota.',
  },
  {
    id: 'jombang',
    name: 'Jombang',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 36 - 42 km',
    travelTime: '± 50 - 65 Menit',
    direction: 'Timur Laut',
    corridor: 'Gampengrejo ➔ Kertosono ➔ Bandar Kedungmulyo ➔ Perak ➔ Jombang Kota',
    lat: -7.5468,
    lng: 112.2331,
    radiusKm: 16,
    description: 'Jalur harian reguler via Kertosono - Flyover Peterongan / Perak - Jombang Kota.',
  },
  {
    id: 'tulungagung',
    name: 'Tulungagung',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 38 - 45 km',
    travelTime: '± 55 - 75 Menit',
    direction: 'Selatan',
    corridor: 'Gampengrejo ➔ Kota Kediri (Ngronggo) ➔ Kras ➔ Ngantru ➔ Tulungagung Kota',
    lat: -8.0653,
    lng: 111.9015,
    radiusKm: 16,
    description: 'Jalur harian reguler via Ngantru - Kras - Tulungagung Kota, Kauman & Boyolangu.',
  },
  {
    id: 'blitar',
    name: 'Blitar',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 48 - 55 km',
    travelTime: '± 1 Jam 15 Mnt - 1.5 Jam',
    direction: 'Tenggara',
    corridor: 'Gampengrejo ➔ Kediri Selatan ➔ Srengat ➔ Sananwetan ➔ Blitar Kota & Wlingi',
    lat: -8.0983,
    lng: 112.1681,
    radiusKm: 17,
    description: 'Jalur harian reguler via Srengat - Sananwetan - Wlingi - Blitar Kota & Kab.',
  },
  {
    id: 'trenggalek',
    name: 'Trenggalek',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 68 - 76 km',
    travelTime: '± 1.5 - 2 Jam',
    direction: 'Barat Daya',
    corridor: 'Gampengrejo ➔ Tulungagung ➔ Durenan ➔ Gandusari ➔ Trenggalek Kota',
    lat: -8.0504,
    lng: 111.7161,
    radiusKm: 16,
    description: 'Jalur harian reguler via Durenan - Gandusari - Trenggalek Kota & Panggul.',
  },
  {
    id: 'madiun',
    name: 'Madiun',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 74 - 82 km',
    travelTime: '± 1 Jam 40 Mnt (Non-Tol) / 55 Mnt (Tol)',
    direction: 'Barat Laut',
    corridor: 'Gampengrejo ➔ Kertosono ➔ Nganjuk ➔ Saradan ➔ Caruban ➔ Madiun',
    lat: -7.6298,
    lng: 111.5239,
    radiusKm: 18,
    description: 'Jalur harian reguler via Saradan - Caruban - Madiun Kota & Kabupaten.',
  },
  // Wilayah Khusus Perdin
  {
    id: 'magetan',
    name: 'Magetan',
    category: 'perdin',
    schedule: 'Setiap Hari SENIN',
    scheduleDay: 'Senin',
    distance: '± 95 - 105 km',
    travelTime: '± 2 Jam 15 Mnt (Non-Tol) / 1 Jam 20 Mnt (Tol)',
    direction: 'Barat',
    corridor: 'Gampengrejo ➔ Nganjuk ➔ Caruban ➔ Madiun ➔ Maospati ➔ Magetan Kota',
    lat: -7.6534,
    lng: 111.3281,
    radiusKm: 16,
    description: 'Wilayah Khusus Perdin - Jadwal pengiriman rutin setiap hari SENIN.',
  },
  {
    id: 'ponorogo',
    name: 'Ponorogo',
    category: 'perdin',
    schedule: 'Setiap Hari RABU',
    scheduleDay: 'Rabu',
    distance: '± 96 - 108 km',
    travelTime: '± 2 Jam 15 Mnt - 2.5 Jam',
    direction: 'Barat Daya',
    corridor: 'Gampengrejo ➔ Caruban ➔ Madiun ➔ Dolopo ➔ Ponorogo Kota (Rute Truk Datar)',
    lat: -7.8687,
    lng: 111.4621,
    radiusKm: 16,
    description: 'Wilayah Khusus Perdin - Jadwal pengiriman rutin setiap hari RABU.',
  },
  {
    id: 'ngawi',
    name: 'Ngawi',
    category: 'perdin',
    schedule: "Setiap Hari JUM'AT",
    scheduleDay: "Jum'at",
    distance: '± 92 - 102 km',
    travelTime: '± 2 Jam 10 Mnt (Non-Tol) / 1 Jam 15 Mnt (Tol)',
    direction: 'Barat Laut Jauh',
    corridor: 'Gampengrejo ➔ Kertosono ➔ Nganjuk ➔ Caruban ➔ Karangjati ➔ Geneng ➔ Ngawi',
    lat: -7.4042,
    lng: 111.4462,
    radiusKm: 16,
    description: "Wilayah Khusus Perdin - Jadwal pengiriman rutin setiap hari JUM'AT.",
  },
];

export default function CoverageMapPanel() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityCoverage>(COVERAGE_CITIES[0]);
  const [mapTileTheme, setMapTileTheme] = useState<'dark' | 'voyager' | 'satellite'>('dark');
  const [mapMode, setMapMode] = useState<'hud' | 'googlemaps'>('hud');
  const [activeFilter, setActiveFilter] = useState<'all' | 'daily' | 'perdin'>('all');

  // Initialize Leaflet Map with Performance Optimizations
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [HUB_INFO.lat, HUB_INFO.lng],
        zoom: 9,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        fadeAnimation: true,
        zoomAnimation: true,
        wheelPxPerZoomLevel: 100,
        wheelDebounceTime: 60,
      });

      // High-DPI Fast Global CDN Tile Layer
      const getTileConfig = (theme: 'dark' | 'voyager' | 'satellite') => {
        if (theme === 'dark') {
          return {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            options: {
              maxZoom: 20,
              subdomains: 'abcd',
              tileSize: 512,
              zoomOffset: -1,
              updateWhenIdle: true,
              keepBuffer: 6,
            },
          };
        } else if (theme === 'satellite') {
          return {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            options: {
              maxZoom: 19,
              subdomains: 'abcd',
              updateWhenIdle: true,
              keepBuffer: 4,
            },
          };
        } else {
          // Voyager HD Street Map (Crystal clear, ultra fast)
          return {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            options: {
              maxZoom: 20,
              subdomains: 'abcd',
              tileSize: 512,
              zoomOffset: -1,
              updateWhenIdle: true,
              keepBuffer: 6,
            },
          };
        }
      };

      const { url, options } = getTileConfig(mapTileTheme);
      const tileLayer = L.tileLayer(url, options).addTo(map);

      mapInstanceRef.current = map;
      (map as any)._customTileLayer = tileLayer;

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      // Handle Smooth Container Resize without crash or tile tears
      if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            try {
              mapInstanceRef.current.invalidateSize({ pan: false, debounceMoveend: true });
            } catch (err) {
              console.warn('Map resize notice:', err);
            }
          }
        });

        if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current);
        }
        (map as any)._resizeObserver = resizeObserver;
      }
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        if ((mapInstanceRef.current as any)._resizeObserver) {
          (mapInstanceRef.current as any)._resizeObserver.disconnect();
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if ((map as any)._customTileLayer) {
      map.removeLayer((map as any)._customTileLayer);
    }

    let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png';
    let options: L.TileLayerOptions = {
      maxZoom: 20,
      subdomains: 'abcd',
      tileSize: 512,
      zoomOffset: -1,
      updateWhenIdle: true,
      keepBuffer: 6,
    };

    if (mapTileTheme === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      options = {
        maxZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 4,
      };
    } else if (mapTileTheme === 'voyager') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png';
      options = {
        maxZoom: 20,
        subdomains: 'abcd',
        tileSize: 512,
        zoomOffset: -1,
        updateWhenIdle: true,
        keepBuffer: 6,
      };
    }

    const newTileLayer = L.tileLayer(url, options).addTo(map);
    (map as any)._customTileLayer = newTileLayer;
  }, [mapTileTheme]);

  // Render Illuminated glowing zones, route lines, and city pins
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    const filtered = COVERAGE_CITIES.filter((c) => {
      if (c.isHub) return true;
      if (activeFilter === 'all') return true;
      return c.category === activeFilter;
    });

    // 1. Draw glowing connecting route beams from WH HCI Kediri to each destination
    filtered.forEach((city) => {
      if (city.isHub) return;
      const isPerdin = city.category === 'perdin';
      const isSelected = selectedCity.id === city.id;

      // Glow route beam line
      L.polyline(
        [
          [HUB_INFO.lat, HUB_INFO.lng],
          [city.lat, city.lng],
        ],
        {
          color: isPerdin ? '#f59e0b' : '#3b82f6',
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 0.9 : 0.45,
          dashArray: isPerdin ? '6, 8' : '2, 6',
          className: 'route-glow-line',
        }
      ).addTo(markersGroup);
    });

    // 2. Draw glowing polygon/circle zones around each city (Cahaya Peta)
    filtered.forEach((city) => {
      const isHub = city.isHub;
      const isPerdin = city.category === 'perdin';
      const isSelected = selectedCity.id === city.id;

      const zoneColor = isHub ? '#38bdf8' : isPerdin ? '#f59e0b' : '#3b82f6';

      // Outer illuminated ambient halo
      L.circle([city.lat, city.lng], {
        radius: (city.radiusKm || 15) * 1000,
        color: zoneColor,
        fillColor: zoneColor,
        fillOpacity: isSelected ? 0.22 : 0.1,
        weight: isSelected ? 2.5 : 1.2,
        opacity: isSelected ? 0.85 : 0.4,
        dashArray: isPerdin ? '4, 4' : undefined,
      }).addTo(markersGroup);

      // Inner concentrated core glow
      if (isSelected || isHub) {
        L.circle([city.lat, city.lng], {
          radius: ((city.radiusKm || 15) * 1000) / 2.5,
          color: zoneColor,
          fillColor: zoneColor,
          fillOpacity: isHub ? 0.28 : 0.18,
          weight: 1,
          opacity: 0.6,
        }).addTo(markersGroup);
      }

      // 3. Custom HTML Marker Pin
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
            <div style="
              width: ${isHub ? '34px' : '26px'};
              height: ${isHub ? '34px' : '26px'};
              border-radius: 10px;
              background: ${
                isHub
                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                  : isPerdin
                  ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                  : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)'
              };
              border: 2px solid ${isHub ? '#ffffff' : isPerdin ? '#fde68a' : '#93c5fd'};
              box-shadow: 0 0 ${isHub ? '22px #38bdf8' : isPerdin ? '16px #f59e0b' : '14px #3b82f6'};
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: ${isHub ? '14px' : '11px'};
              font-weight: bold;
            ">
              ${isHub ? '🏢' : isPerdin ? '🚚' : '📍'}
            </div>
            <div style="
              margin-top: 3px;
              padding: 2px 8px;
              border-radius: 6px;
              background: rgba(10, 15, 26, 0.9);
              border: 1px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'};
              color: ${isSelected ? '#ffffff' : '#e2e8f0'};
              font-size: 10px;
              font-weight: ${isSelected || isHub ? 'bold' : '600'};
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            ">
              ${city.name.replace(' (Pusat Hub)', '').replace(' (Kota & Kab)', '')}
            </div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([city.lat, city.lng], { icon: customIcon }).addTo(markersGroup);
      marker.on('click', () => {
        setSelectedCity(city);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([city.lat, city.lng], 10, { duration: 1 });
        }
      });
    });
  }, [selectedCity, mapTileTheme, activeFilter]);

  const handleFlyTo = (city: CityCoverage) => {
    setSelectedCity(city);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([city.lat, city.lng], city.isHub ? 11 : 10, { duration: 1.2 });
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([HUB_INFO.lat, HUB_INFO.lng], 9, { duration: 1.2 });
      setSelectedCity(COVERAGE_CITIES[0]);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Alamat Resmi WH HCI KEDIRI Banner */}
      <section className="glossy-panel rounded-2xl p-4 sm:p-5 shadow-2xl border-l-4 border-l-blue-500 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500/25 to-blue-600/10 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] shrink-0 mt-0.5">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  {HUB_INFO.name}
                </h2>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  CENTRAL WAREHOUSE
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  AKTIF & TERHUBUNG
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{HUB_INFO.address}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Button to Google Maps */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={HUB_INFO.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka di Google Maps</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Interactive Map & City Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Real Leaflet / Google-style Map Canvas (8 cols) */}
        <div className="lg:col-span-8 glossy-panel rounded-2xl p-3 sm:p-4 flex flex-col shadow-2xl overflow-hidden relative min-h-[480px]">
          {/* Map Controls Header */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-white/[0.08] z-10 flex-wrap">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider">
                Peta Satelit & Wilayah Bercahaya
              </span>
            </div>

            {/* Map Theme & Mode Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Map Mode Picker */}
              <div className="flex bg-black/60 rounded-xl p-1 border border-white/[0.08] text-[10px]">
                <button
                  onClick={() => {
                    setMapMode('hud');
                    setMapTileTheme('dark');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    mapMode === 'hud' && mapTileTheme === 'dark'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Glow Dark
                </button>
                <button
                  onClick={() => {
                    setMapMode('hud');
                    setMapTileTheme('voyager');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    mapMode === 'hud' && mapTileTheme === 'voyager'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Jalan HD (@2x)
                </button>
                <button
                  onClick={() => {
                    setMapMode('hud');
                    setMapTileTheme('satellite');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    mapMode === 'hud' && mapTileTheme === 'satellite'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Satelit
                </button>
                <button
                  onClick={() => setMapMode('googlemaps')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    mapMode === 'googlemaps'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                      : 'text-zinc-400 hover:text-emerald-400'
                  }`}
                >
                  <span>🌐 Google Maps Asli</span>
                </button>
              </div>

              {/* Map Zoom / Reset Controls */}
              {mapMode === 'hud' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => mapInstanceRef.current?.zoomIn()}
                    title="Perbesar"
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => mapInstanceRef.current?.zoomOut()}
                    title="Perkecil"
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetView}
                    title="Pusatkan ke WH HCI Kediri"
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Real Map Canvas Container */}
          <div className="flex-1 w-full rounded-xl overflow-hidden relative border border-white/[0.08] min-h-[420px]">
            {mapMode === 'googlemaps' ? (
              <iframe
                title="Google Maps WH HCI KEDIRI"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3953.220194883187!2d112.0289251!3d-7.7552!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7851a31416b577%3A0xd320aeec05b0122!2sWH%20HCI%20KEDIRi!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
                className="w-full h-full min-h-[420px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            ) : (
              <>
                <div ref={mapContainerRef} className="w-full h-full min-h-[420px] z-0" />

                {/* Map Legend Overlay */}
                <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md p-2.5 rounded-xl border border-white/[0.1] text-[10px] space-y-1.5 shadow-xl z-[400]">
                  <div className="flex items-center gap-2 text-blue-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
                    <span>Jalur Daily (7 Wilayah)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
                    <span>Khusus Perdin (3 Wilayah)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Filter & City Navigator (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          {/* Quick Filter & City Navigator */}
          <div className="glossy-panel rounded-2xl p-4 shadow-2xl space-y-2.5 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Pilih Wilayah</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                    activeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setActiveFilter('daily')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                    activeFilter === 'daily' ? 'bg-blue-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setActiveFilter('perdin')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                    activeFilter === 'perdin' ? 'bg-amber-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  Perdin
                </button>
              </div>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[420px] scrollbar-hide pr-1 flex-1">
              {COVERAGE_CITIES.filter((c) => {
                if (activeFilter === 'all') return true;
                if (c.isHub) return true;
                return c.category === activeFilter;
              }).map((city) => {
                const isSelected = selectedCity.id === city.id;
                const isPerdin = city.category === 'perdin';
                return (
                  <button
                    key={city.id}
                    onClick={() => handleFlyTo(city)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/30 border border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          city.isHub ? 'bg-sky-400' : isPerdin ? 'bg-amber-400' : 'bg-blue-400'
                        }`}
                      ></span>
                      <span className="text-xs font-bold text-zinc-200 truncate">{city.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded ${
                        isPerdin
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-400/20'
                          : city.isHub
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-400/20'
                          : 'bg-blue-500/15 text-blue-300 border border-blue-400/20'
                      }`}
                    >
                      {isPerdin ? city.scheduleDay : city.isHub ? 'Hub Pusat' : 'Daily'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
