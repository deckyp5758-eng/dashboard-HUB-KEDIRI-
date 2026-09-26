import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  ExternalLink,
  Building2,
  Radio,
  ZoomIn,
  ZoomOut,
  LocateFixed,
} from 'lucide-react';
import { Pengiriman } from '../types';

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
  keywords: string[];
  waypoints: [number, number][];
}

interface CoverageMapPanelProps {
  data?: Pengiriman[];
}

const OSRM_LOCAL_STORAGE_KEY = 'hub_kediri_osrm_routes_v1';

// Exact HUB KEDIRI Coordinates & Location
const HUB_INFO = {
  name: 'WH HCI KEDIRI',
  address:
    'Jl. Kertosono - Tulungagung No.134, Putih, Kec. Gampengrejo, Kabupaten Kediri, Jawa Timur 64182',
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
    corridor: 'Jl. Kertosono - Tulungagung No.134 ➔ Putih ➔ Kec. Gampengrejo ➔ Kab. Kediri',
    lat: HUB_INFO.lat,
    lng: HUB_INFO.lng,
    radiusKm: 12,
    description: HUB_INFO.address,
    isHub: true,
    keywords: ['gampengrejo', 'putih'],
    waypoints: [[HUB_INFO.lat, HUB_INFO.lng]],
  },
  {
    id: 'kediri_area',
    name: 'Kediri (Kota & Kab)',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 8 - 25 km',
    travelTime: '± 15 - 35 Menit',
    direction: 'Lokal Kediri Raya',
    corridor: 'Gampengrejo ➔ Jl. Mayor Bismo ➔ Kota Kediri ➔ Pare / Gurah / Ngadiluwih / Kras',
    lat: -7.8167,
    lng: 112.0167,
    radiusKm: 16,
    description:
      'Wilayah inti distribusi harian Kota Kediri, Mojoroto, Pesantren, Pare, Grogol, Gurah, & sekitarnya.',
    keywords: [
      'kediri',
      'pare',
      'gurah',
      'ngadiluwih',
      'mojoroto',
      'pesantren',
      'grogol',
      'banyakan',
      'pagu',
      'wates',
      'kandat',
      'plosoklaten',
      'kandangan',
      'papar',
      'purwoasri',
    ],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.785, 112.012],
      [-7.8167, 112.0167],
    ],
  },
  {
    id: 'nganjuk',
    name: 'Nganjuk',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 32 - 36 km',
    travelTime: '± 45 - 60 Menit',
    direction: 'Utara - Barat Laut',
    corridor: 'Gampengrejo ➔ Papar ➔ Purwoasri ➔ Kertosono ➔ Baron ➔ Sukomoro ➔ Nganjuk Kota',
    lat: -7.6053,
    lng: 111.9038,
    radiusKm: 15,
    description: 'Jalur harian reguler via Kertosono - Baron - Sukomoro - Nganjuk Kota & Warujayeng.',
    keywords: ['nganjuk', 'kertosono', 'baron', 'sukomoro', 'warujayeng', 'tanjunganom', 'prambon', 'pace', 'loceret', 'berbek'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.685, 112.075],
      [-7.592, 112.095],
      [-7.602, 111.995],
      [-7.6053, 111.9038],
    ],
  },
  {
    id: 'jombang',
    name: 'Jombang',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 36 - 42 km',
    travelTime: '± 50 - 65 Menit',
    direction: 'Timur Laut',
    corridor: 'Gampengrejo ➔ Purwoasri ➔ Mengkreng ➔ Bandar Kedungmulyo ➔ Perak ➔ Jombang Kota',
    lat: -7.5468,
    lng: 112.2331,
    radiusKm: 16,
    description: 'Jalur harian reguler via Kertosono - Perak - Jombang Kota, Diwek, & Mojoagung.',
    keywords: ['jombang', 'perak', 'diwek', 'mojoagung', 'peterongan', 'ploso', 'cukir', 'gudo', 'ngoro'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.685, 112.075],
      [-7.592, 112.105],
      [-7.568, 112.175],
      [-7.5468, 112.2331],
    ],
  },
  {
    id: 'tulungagung',
    name: 'Tulungagung',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 38 - 45 km',
    travelTime: '± 55 - 75 Menit',
    direction: 'Selatan',
    corridor: 'Gampengrejo ➔ Ngronggo ➔ Ngadiluwih ➔ Kras ➔ Ngantru ➔ Kedungwaru ➔ Tulungagung Kota',
    lat: -8.0653,
    lng: 111.9015,
    radiusKm: 16,
    description: 'Jalur harian reguler via Ngantru - Kedungwaru - Tulungagung Kota, Kauman, Ngunut & Boyolangu.',
    keywords: ['tulungagung', 'ngantru', 'kedungwaru', 'boyolangu', 'kauman', 'ngunut', 'campurdarat', 'rejotangan'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.835, 112.012],
      [-7.935, 111.975],
      [-8.015, 111.925],
      [-8.0653, 111.9015],
    ],
  },
  {
    id: 'blitar',
    name: 'Blitar',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 48 - 55 km',
    travelTime: '± 1 Jam 15 Mnt - 1.5 Jam',
    direction: 'Tenggara',
    corridor: 'Gampengrejo ➔ Kediri Selatan ➔ Ringinrejo ➔ Srengat ➔ Sananwetan ➔ Blitar Kota & Wlingi',
    lat: -8.0983,
    lng: 112.1681,
    radiusKm: 17,
    description: 'Jalur harian reguler via Srengat - Sananwetan - Kanigoro - Talun - Wlingi - Blitar Kota & Kab.',
    keywords: ['blitar', 'srengat', 'wlingi', 'kanigoro', 'talun', 'sananwetan', 'kepanjenkidul', 'sukorejo', 'kesamben', 'lodoyo', 'sutojayan', 'ponggok', 'udem'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.845, 112.028],
      [-7.965, 112.062],
      [-8.065, 112.085],
      [-8.0983, 112.1681],
    ],
  },
  {
    id: 'trenggalek',
    name: 'Trenggalek',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 68 - 76 km',
    travelTime: '± 1.5 - 2 Jam',
    direction: 'Barat Daya',
    corridor: 'Gampengrejo ➔ Tulungagung ➔ Kauman ➔ Durenan ➔ Pogalan ➔ Trenggalek Kota',
    lat: -8.0504,
    lng: 111.7161,
    radiusKm: 16,
    description: 'Jalur harian reguler via Tulungagung - Durenan - Pogalan - Trenggalek Kota & Karangan.',
    keywords: ['trenggalek', 'durenan', 'pogalan', 'gandusari', 'karangan', 'tugu', 'watulimo', 'prigi', 'panggul'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.935, 111.975],
      [-8.065, 111.901],
      [-8.072, 111.805],
      [-8.0504, 111.7161],
    ],
  },
  {
    id: 'madiun',
    name: 'Madiun',
    category: 'daily',
    schedule: 'Setiap Hari (Daily)',
    distance: '± 74 - 82 km',
    travelTime: '± 1 Jam 40 Mnt (Non-Tol) / 55 Mnt (Tol)',
    direction: 'Barat Laut',
    corridor: 'Gampengrejo ➔ Kertosono ➔ Nganjuk ➔ Wilangan ➔ Saradan ➔ Caruban ➔ Madiun Kota',
    lat: -7.6298,
    lng: 111.5239,
    radiusKm: 18,
    description: 'Jalur harian reguler via Nganjuk - Saradan - Caruban (Mejayan) - Madiun Kota & Jiwan.',
    keywords: ['madiun', 'caruban', 'mejayan', 'saradan', 'wungu', 'jiwan', 'geger', 'dolopo', 'balerejo'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.592, 112.095],
      [-7.605, 111.903],
      [-7.558, 111.745],
      [-7.547, 111.655],
      [-7.6298, 111.5239],
    ],
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
    corridor: 'Gampengrejo ➔ Nganjuk ➔ Caruban ➔ Madiun ➔ Maospati ➔ Sukomoro ➔ Magetan Kota',
    lat: -7.6534,
    lng: 111.3281,
    radiusKm: 16,
    description: 'Wilayah Khusus Perdin - Jadwal pengiriman rutin setiap hari SENIN (Maospati, Magetan, Plaosan).',
    keywords: ['magetan', 'maospati', 'plaosan', 'karangrejo', 'barat', 'kawedanan', 'goranggareng'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.605, 111.903],
      [-7.547, 111.655],
      [-7.629, 111.523],
      [-7.612, 111.425],
      [-7.6534, 111.3281],
    ],
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
    corridor: 'Gampengrejo ➔ Caruban ➔ Madiun ➔ Geger ➔ Dolopo ➔ Mlilir ➔ Ponorogo Kota (Rute Truk Datar)',
    lat: -7.8687,
    lng: 111.4621,
    radiusKm: 16,
    description: 'Wilayah Khusus Perdin - Jadwal pengiriman rutin setiap hari RABU via jalur datar Madiun - Dolopo.',
    keywords: ['ponorogo', 'babadan', 'jenangan', 'siman', 'jetis', 'kauman ponorogo', 'sumoroto', 'balong'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.605, 111.903],
      [-7.547, 111.655],
      [-7.629, 111.523],
      [-7.745, 111.512],
      [-7.8687, 111.4621],
    ],
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
    corridor: 'Gampengrejo ➔ Kertosono ➔ Nganjuk ➔ Caruban ➔ Karangjati ➔ Geneng ➔ Ngawi Kota',
    lat: -7.4042,
    lng: 111.4462,
    radiusKm: 16,
    description: "Wilayah Khusus Perdin - Jadwal pengiriman rutin setiap hari JUM'AT via Karangjati - Ngawi Kota.",
    keywords: ['ngawi', 'karangjati', 'geneng', 'paron', 'jogorogo', 'widodaren', 'walikukun', 'mantingan'],
    waypoints: [
      [HUB_INFO.lat, HUB_INFO.lng],
      [-7.605, 111.903],
      [-7.547, 111.655],
      [-7.475, 111.575],
      [-7.4042, 111.4462],
    ],
  },
];

type MapTileTheme = 'osm' | 'satellite' | 'topo';

interface OsrmCachedRoute {
  coordinates: [number, number][];
  distanceKm: string;
  durationMin: number;
}

export default function CoverageMapPanel({ data = [] }: CoverageMapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityCoverage>(COVERAGE_CITIES[0]);
  const [mapTileTheme, setMapTileTheme] = useState<MapTileTheme>('osm');
  const [activeFilter, setActiveFilter] = useState<'all' | 'daily' | 'perdin'>('all');
  const [osrmRoutes, setOsrmRoutes] = useState<Record<string, OsrmCachedRoute>>(() => {
    try {
      const saved = localStorage.getItem(OSRM_LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Hitung distribusi muatan aktif (Surat Jalan / DO & CBM) per wilayah kota secara otomatis
  const cityShipmentStats = useMemo(() => {
    const stats: Record<
      string,
      { count: number; totalCbm: number; orders: Pengiriman[]; drivers: string[] }
    > = {};

    COVERAGE_CITIES.forEach((c) => {
      stats[c.id] = { count: 0, totalCbm: 0, orders: [], drivers: [] };
    });

    data.forEach((order) => {
      const haystack = `${order.address || ''} ${order.name || ''}`.toLowerCase();
      if (!haystack.trim()) return;

      // Cari kecocokan dengan kota tujuan (prioritaskan luar Kediri lebih dulu agar spesifik)
      const nonKediriCities = COVERAGE_CITIES.filter((c) => !c.isHub && c.id !== 'kediri_area');
      let matchedCity = nonKediriCities.find((c) =>
        c.keywords.some((kw) => haystack.includes(kw.toLowerCase()))
      );

      if (!matchedCity) {
        const kediriCity = COVERAGE_CITIES.find((c) => c.id === 'kediri_area');
        if (kediriCity && kediriCity.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
          matchedCity = kediriCity;
        }
      }

      if (matchedCity) {
        const entry = stats[matchedCity.id];
        entry.count += 1;
        entry.totalCbm += parseFloat(order.cbm || '0') || 0;
        entry.orders.push(order);
        if (order.driver && !entry.drivers.includes(order.driver)) {
          entry.drivers.push(order.driver);
        }
      }
    });

    // Untuk Hub Kediri, tampilkan total seluruh wilayah
    const totalAllCount = data.length;
    const totalAllCbm = data.reduce((acc, o) => acc + (parseFloat(o.cbm || '0') || 0), 0);
    stats['hub_kediri'] = {
      count: totalAllCount,
      totalCbm: totalAllCbm,
      orders: data.slice(0, 6),
      drivers: Array.from(new Set(data.map((d) => d.driver).filter(Boolean))),
    };

    return stats;
  }, [data]);

  // Ambil rute jalan raya sebenarnya via OSRM (100% Gratis Tanpa API Key) + Cache Lokal
  useEffect(() => {
    if (selectedCity.isHub) return;
    if (osrmRoutes[selectedCity.id]) return;

    let cancelled = false;
    const fetchOsrmGeometry = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${HUB_INFO.lng},${HUB_INFO.lat};${selectedCity.lng},${selectedCity.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const route = json?.routes?.[0];
        if (!route || !route.geometry?.coordinates || cancelled) return;

        const latLngs: [number, number][] = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);

        setOsrmRoutes((prev) => {
          const updated = {
            ...prev,
            [selectedCity.id]: {
              coordinates: latLngs,
              distanceKm,
              durationMin,
            },
          };
          try {
            localStorage.setItem(OSRM_LOCAL_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // Ignore storage quota
          }
          return updated;
        });
      } catch {
        // Fallback otomatis ke waypoints koridor darat jika sedang offline
      }
    };

    fetchOsrmGeometry();
    return () => {
      cancelled = true;
    };
  }, [selectedCity, osrmRoutes]);

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

      mapInstanceRef.current = map;

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

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
      if (mapInstanceRef.current) {
        if ((mapInstanceRef.current as any)._resizeObserver) {
          (mapInstanceRef.current as any)._resizeObserver.disconnect();
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when theme changes (3 Free Providers Without API Key)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if ((map as any)._customTileLayer) {
      map.removeLayer((map as any)._customTileLayer);
      (map as any)._customTileLayer = null;
    }
    if ((map as any)._customOverlayLayer) {
      map.removeLayer((map as any)._customOverlayLayer);
      (map as any)._customOverlayLayer = null;
    }

    let baseLayer: L.TileLayer;
    let overlayLayer: L.TileLayer | null = null;

    if (mapTileTheme === 'satellite') {
      // Esri World Imagery + Hybrid Reference Labels (100% Free, No API Key)
      baseLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          updateWhenIdle: true,
          keepBuffer: 4,
        }
      );
      overlayLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          opacity: 0.85,
          updateWhenIdle: true,
        }
      );
    } else if (mapTileTheme === 'topo') {
      // OpenTopoMap (Kontur Tanjakan & Pegunungan Jawa Timur)
      baseLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        subdomains: 'abc',
        updateWhenIdle: true,
        keepBuffer: 4,
      });
    } else {
      // Default: OpenStreetMap Standard (Detail Jalan Desa / Gang Lengkap)
      baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: 'abc',
        updateWhenIdle: true,
        keepBuffer: 4,
      });
    }

    baseLayer.addTo(map);
    (map as any)._customTileLayer = baseLayer;

    if (overlayLayer) {
      overlayLayer.addTo(map);
      (map as any)._customOverlayLayer = overlayLayer;
    }
  }, [mapTileTheme]);

  // Render Illuminated glowing zones, real road route lines, and city pins
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    const filtered = COVERAGE_CITIES.filter((c) => {
      if (c.isHub) return true;
      if (activeFilter === 'all') return true;
      return c.category === activeFilter;
    });

    // 1. Gambar jalur koridor jalan raya (OSRM Real Road Geometry atau Waypoints Koridor)
    filtered.forEach((city) => {
      if (city.isHub) return;
      const isPerdin = city.category === 'perdin';
      const isSelected = selectedCity.id === city.id;
      const cachedOsrm = osrmRoutes[city.id];
      const pathCoords = cachedOsrm?.coordinates || city.waypoints;

      // Halo luar untuk rute kota yang sedang dipilih
      if (isSelected) {
        L.polyline(pathCoords, {
          color: isPerdin ? '#fbbf24' : '#38bdf8',
          weight: 8,
          opacity: 0.28,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(markersGroup);
      }

      // Garis utama koridor jalan raya
      L.polyline(pathCoords, {
        color: isSelected
          ? isPerdin
            ? '#fbbf24'
            : '#38bdf8'
          : isPerdin
          ? '#f59e0b'
          : '#3b82f6',
        weight: isSelected ? 4 : 2.2,
        opacity: isSelected ? 0.95 : 0.5,
        dashArray: isSelected ? undefined : isPerdin ? '6, 8' : '3, 6',
        className: 'route-glow-line',
      }).addTo(markersGroup);
    });

    // 2. Gambar zona cakupan wilayah & Pin Kota dengan status beban DO aktif
    filtered.forEach((city) => {
      const isHub = city.isHub;
      const isPerdin = city.category === 'perdin';
      const isSelected = selectedCity.id === city.id;
      const cityStat = cityShipmentStats[city.id] || { count: 0, totalCbm: 0 };

      const zoneColor = isHub ? '#38bdf8' : isPerdin ? '#f59e0b' : '#3b82f6';

      L.circle([city.lat, city.lng], {
        radius: (city.radiusKm || 15) * 1000,
        color: zoneColor,
        fillColor: zoneColor,
        fillOpacity: isSelected ? 0.22 : 0.09,
        weight: isSelected ? 2.5 : 1.2,
        opacity: isSelected ? 0.85 : 0.38,
        dashArray: isPerdin ? '4, 4' : undefined,
      }).addTo(markersGroup);

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

      const badgeHtml =
        !isHub && cityStat.count > 0
          ? `<span style="margin-left: 4px; padding: 1px 5px; border-radius: 4px; background: #10b981; color: #052e16; font-size: 9px; font-weight: 800;">${cityStat.count} DO</span>`
          : '';

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
            <div style="
              width: ${isHub ? '34px' : isSelected ? '30px' : '26px'};
              height: ${isHub ? '34px' : isSelected ? '30px' : '26px'};
              border-radius: 10px;
              background: ${
                isHub
                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                  : isPerdin
                  ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                  : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)'
              };
              border: 2px solid ${isHub ? '#ffffff' : isSelected ? '#38bdf8' : isPerdin ? '#fde68a' : '#93c5fd'};
              box-shadow: 0 0 ${isHub ? '22px #38bdf8' : isSelected ? '20px #38bdf8' : isPerdin ? '14px #f59e0b' : '12px #3b82f6'};
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
              padding: 2px 7px;
              border-radius: 6px;
              background: rgba(9, 11, 18, 0.92);
              border: 1px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.18)'};
              color: ${isSelected ? '#ffffff' : '#e2e8f0'};
              font-size: 10px;
              font-weight: ${isSelected || isHub ? 'bold' : '600'};
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0,0,0,0.65);
              display: flex;
              align-items: center;
            ">
              <span>${city.name.replace(' (Pusat Hub)', '').replace(' (Kota & Kab)', '')}</span>
              ${badgeHtml}
            </div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([city.lat, city.lng], { icon: customIcon }).addTo(markersGroup);
      marker.on('click', () => {
        setSelectedCity(city);
        if (mapInstanceRef.current) {
          if (city.isHub) {
            mapInstanceRef.current.flyTo([city.lat, city.lng], 10, { duration: 1 });
          } else {
            const bounds = L.latLngBounds([
              [HUB_INFO.lat, HUB_INFO.lng],
              [city.lat, city.lng],
            ]);
            mapInstanceRef.current.flyToBounds(bounds.pad(0.28), { duration: 1.1, maxZoom: 11 });
          }
        }
      });
    });
  }, [selectedCity, mapTileTheme, activeFilter, osrmRoutes, cityShipmentStats]);

  const handleFlyTo = (city: CityCoverage) => {
    setSelectedCity(city);
    if (mapInstanceRef.current) {
      if (city.isHub) {
        mapInstanceRef.current.flyTo([city.lat, city.lng], 10, { duration: 1.1 });
      } else {
        const bounds = L.latLngBounds([
          [HUB_INFO.lat, HUB_INFO.lng],
          [city.lat, city.lng],
        ]);
        mapInstanceRef.current.flyToBounds(bounds.pad(0.28), { duration: 1.1, maxZoom: 11 });
      }
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([HUB_INFO.lat, HUB_INFO.lng], 9, { duration: 1.1 });
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
                <span className="text-xs text-blue-300 font-semibold">
                  · Central Warehouse · Bebas Kuota Peta (Offline-Ready)
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{HUB_INFO.address}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={HUB_INFO.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Titik Gudang Hub</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Interactive Map & City Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Multi-Layer Zero-API-Key Map Canvas (8 cols) */}
        <div className="lg:col-span-8 glossy-panel rounded-2xl p-3 sm:p-4 flex flex-col shadow-2xl overflow-hidden relative min-h-[490px]">
          {/* Map Controls Header */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-white/[0.08] z-10 flex-wrap">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider">
                Peta Koridor Jalan Raya & Distribusi Wilayah
              </span>
            </div>

            {/* 3 Free Map Layer Switcher (Tanpa API Key) */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-black/60 rounded-xl p-1 border border-white/[0.08] text-[10px] flex-wrap gap-0.5">
                {[
                  { id: 'osm', label: 'Jalan Desa (OSM)' },
                  { id: 'satellite', label: 'Satelit Hybrid' },
                  { id: 'topo', label: 'Medan Tanjakan' },
                ].map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => setMapTileTheme(layer.id as MapTileTheme)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      mapTileTheme === layer.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>

              {/* Map Zoom / Reset Controls */}
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
            </div>
          </div>

          {/* Real Map Canvas Container */}
          <div className="flex-1 w-full rounded-xl overflow-hidden relative border border-white/[0.08] min-h-[420px]">
            <div ref={mapContainerRef} className="w-full h-full min-h-[420px] z-0" />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md p-2.5 rounded-xl border border-white/[0.12] text-[10px] space-y-1.5 shadow-xl z-[400]">
              <div className="flex items-center gap-2 text-blue-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
                <span>Jalur Daily (7 Wilayah)</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
                <span>Khusus Perdin (Senin/Rabu/Jum&apos;at)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                <span>Rute Jalan Raya OSRM (Tanpa Kuota)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Filter & City Navigator (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="glossy-panel rounded-2xl p-4 shadow-2xl space-y-2.5 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="text-xs font-bold text-white tracking-wider">Pilih Koridor Wilayah</span>
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

            <div className="space-y-1.5 overflow-y-auto max-h-[430px] scrollbar-hide pr-1 flex-1">
              {COVERAGE_CITIES.filter((c) => {
                if (activeFilter === 'all') return true;
                if (c.isHub) return true;
                return c.category === activeFilter;
              }).map((city) => {
                const isSelected = selectedCity.id === city.id;
                const isPerdin = city.category === 'perdin';
                const stat = cityShipmentStats[city.id] || { count: 0, totalCbm: 0 };

                return (
                  <button
                    key={city.id}
                    onClick={() => handleFlyTo(city)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/30 border border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            city.isHub ? 'bg-sky-400' : isPerdin ? 'bg-amber-400' : 'bg-blue-400'
                          }`}
                        ></span>
                        <span className="text-xs font-bold text-zinc-100 truncate">{city.name}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 pl-4 mt-0.5 flex items-center gap-1.5">
                        <span>{city.distance}</span>
                        {!city.isHub && stat.count > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400 font-semibold tabular-nums">
                              {stat.count} DO ({stat.totalCbm.toFixed(1)} m³)
                            </span>
                          </>
                        )}
                      </div>
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
