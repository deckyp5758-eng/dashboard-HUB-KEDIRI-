import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import { createServer as createViteServer } from "vite";

const SPREADSHEET_ID = "1nywoI4jT7ih12mdeRLFqgld6HGLdDIaJDBuiKvaX6o8";
const PERSONIL_SHEET_ID = 1831064929;
const PENGIRIMAN_SHEET_ID = 1375575560;
const ANALISIS_SHEET_ID = 774474728;
const DATA_DIR = path.join(process.cwd(), "public", "data");
const SYNC_DATA_FILE = path.join(DATA_DIR, "logistics-sync.json");
const CACHE_TTL_MS = 60 * 1000; // 60 detik server-side RAM cache

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface LogisticsPayload {
  status: string;
  source: "github-workflow-file" | "google-apps-script" | "github-sync" | "webhook-push" | "sheets-api-cached" | "local-snapshot";
  updatedAt: string;
  spreadsheetId: string;
  sheetNames: string[];
  onDutyRows: string[][];
  shippingRows: string[][];
  trendRows: string[][];
  stats?: {
    onDutyCount: number;
    shippingCount: number;
    trendCount: number;
  };
  cachedAt?: string;
}

function loadDiskSnapshot(): LogisticsPayload | null {
  try {
    if (fs.existsSync(SYNC_DATA_FILE)) {
      const raw = fs.readFileSync(SYNC_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.onDutyRows) && parsed.onDutyRows.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to read logistics-sync.json snapshot:", e);
  }
  return null;
}

function saveDiskSnapshot(payload: LogisticsPayload) {
  try {
    fs.writeFileSync(SYNC_DATA_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to write logistics-sync.json snapshot:", e);
  }
}

let memoryCache: LogisticsPayload | null = loadDiskSnapshot();
let lastFetchTimestamp = memoryCache ? Date.now() - 45000 : 0;
let cachedSheetNames: string[] | null = memoryCache?.sheetNames || null;
let inFlightPromise: Promise<LogisticsPayload> | null = null;

async function fetchFromGasWebApp(gasUrl: string, force: boolean): Promise<LogisticsPayload> {
  const separator = gasUrl.includes("?") ? "&" : "?";
  const targetUrl = force ? `${gasUrl}${separator}force=1` : gasUrl;
  const response = await axios.get(targetUrl, {
    timeout: 15000,
    maxRedirects: 5,
  });
  const data = response.data;
  if (!data || data.status === "error" || !Array.isArray(data.onDutyRows)) {
    throw new Error(data?.message || "Respons Google Apps Script (Code.gs) tidak valid");
  }
  return {
    status: "ok",
    source: "google-apps-script",
    updatedAt: data.updatedAt || new Date().toISOString(),
    spreadsheetId: data.spreadsheetId || SPREADSHEET_ID,
    sheetNames: data.sheetNames || ["OnDuty", "Pengiriman", "Tren"],
    onDutyRows: data.onDutyRows || [],
    shippingRows: data.shippingRows || [],
    trendRows: data.trendRows || [],
    stats: {
      onDutyCount: Math.max(0, (data.onDutyRows || []).length - 1),
      shippingCount: (data.shippingRows || []).length,
      trendCount: (data.trendRows || []).length,
    },
  };
}

async function fetchFromGitHubRaw(githubRawUrl: string): Promise<LogisticsPayload> {
  const separator = githubRawUrl.includes("?") ? "&" : "?";
  const response = await axios.get(`${githubRawUrl}${separator}t=${Date.now()}`, {
    timeout: 12000,
  });
  const data = response.data;
  if (!data || !Array.isArray(data.onDutyRows)) {
    throw new Error("Format file JSON di GitHub tidak valid");
  }
  return {
    status: "ok",
    source: "github-sync",
    updatedAt: data.updatedAt || new Date().toISOString(),
    spreadsheetId: data.spreadsheetId || SPREADSHEET_ID,
    sheetNames: data.sheetNames || ["OnDuty", "Pengiriman", "Tren"],
    onDutyRows: data.onDutyRows || [],
    shippingRows: data.shippingRows || [],
    trendRows: data.trendRows || [],
    stats: {
      onDutyCount: Math.max(0, (data.onDutyRows || []).length - 1),
      shippingCount: (data.shippingRows || []).length,
      trendCount: (data.trendRows || []).length,
    },
  };
}

async function fetchFromSheetsApiBatch(): Promise<LogisticsPayload> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_SHEETS_API_KEY belum diatur.");
  }

  if (!cachedSheetNames || cachedSheetNames.length < 2) {
    const metaRes = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties(title,sheetId)&key=${apiKey}`,
      { timeout: 12000 }
    );
    const sheets = metaRes.data.sheets || [];
    const personilTitle =
      sheets.find((s: any) => s.properties?.sheetId === PERSONIL_SHEET_ID)?.properties?.title ||
      sheets[0]?.properties?.title ||
      "Sheet1";
    const pengirimanTitle =
      sheets.find((s: any) => s.properties?.sheetId === PENGIRIMAN_SHEET_ID)?.properties?.title ||
      sheets[1]?.properties?.title ||
      "Sheet2";
    const analisisTitle =
      sheets.find((s: any) => s.properties?.sheetId === ANALISIS_SHEET_ID)?.properties?.title ||
      sheets[2]?.properties?.title ||
      "Sheet3";
    cachedSheetNames = [personilTitle, pengirimanTitle, analisisTitle];
  }

  const s0 = cachedSheetNames![0] || "Sheet1";
  const s1 = cachedSheetNames![1] || "Sheet2";
  const s2 = cachedSheetNames![2] || "Sheet3";

  const ranges = [`${s0}!A1:AZ500`, `${s1}!A2:W2500`, `${s2}!A2:H2500`];
  const queryRanges = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${queryRanges}&key=${apiKey}`;

  const batchRes = await axios.get(batchUrl, { timeout: 15000 });
  const valueRanges = batchRes.data.valueRanges || [];

  const onDutyRows: string[][] = valueRanges[0]?.values || [];
  const shippingRows: string[][] = valueRanges[1]?.values || [];
  const trendRows: string[][] = valueRanges[2]?.values || [];

  return {
    status: "ok",
    source: "sheets-api-cached",
    updatedAt: new Date().toISOString(),
    spreadsheetId: SPREADSHEET_ID,
    sheetNames: cachedSheetNames!,
    onDutyRows,
    shippingRows,
    trendRows,
    stats: {
      onDutyCount: Math.max(0, onDutyRows.length - 1),
      shippingCount: shippingRows.length,
      trendCount: trendRows.length,
    },
  };
}

async function getUnifiedLogisticsData(forceRefresh = false): Promise<LogisticsPayload> {
  const now = Date.now();

  if (!forceRefresh && memoryCache && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return {
      ...memoryCache,
      cachedAt: new Date(lastFetchTimestamp).toISOString(),
    };
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    const errors: string[] = [];
    const gasWebAppUrl = process.env.GAS_WEBAPP_URL;
    const githubRawUrl = process.env.GITHUB_RAW_DATA_URL;

    // PRIORITAS 1: Server-side GAS_WEBAPP_URL (dari Environment Secret)
    if (gasWebAppUrl) {
      try {
        const gasData = await fetchFromGasWebApp(gasWebAppUrl, forceRefresh);
        memoryCache = gasData;
        lastFetchTimestamp = Date.now();
        saveDiskSnapshot(gasData);
        return gasData;
      } catch (err: any) {
        errors.push(`GAS Error: ${err.message}`);
      }
    }

    // PRIORITAS 2: Server-side GITHUB_RAW_DATA_URL (dari Environment Secret)
    if (githubRawUrl) {
      try {
        const ghData = await fetchFromGitHubRaw(githubRawUrl);
        memoryCache = ghData;
        lastFetchTimestamp = Date.now();
        saveDiskSnapshot(ghData);
        return ghData;
      } catch (err: any) {
        errors.push(`GitHub Raw Error: ${err.message}`);
      }
    }

    // PRIORITAS 3: File public/data/logistics-sync.json yang di-commit oleh GitHub Actions Workflow
    const diskData = loadDiskSnapshot();
    if (diskData && !forceRefresh) {
      memoryCache = diskData;
      lastFetchTimestamp = Date.now();
      return {
        ...diskData,
        source: "github-workflow-file",
      };
    }

    // PRIORITAS 4: Google Sheets API BatchGet + Server-Side Caching (Hemat 98% Kuota)
    try {
      const apiData = await fetchFromSheetsApiBatch();
      memoryCache = apiData;
      lastFetchTimestamp = Date.now();
      saveDiskSnapshot(apiData);
      return apiData;
    } catch (err: any) {
      errors.push(`Sheets API Error: ${err.message}`);
    }

    // PRIORITAS 5: Fallback ke Snapshot Terakhir di Disk / RAM
    const fallback = memoryCache || diskData;
    if (fallback) {
      return {
        ...fallback,
        source: "local-snapshot",
      };
    }

    throw new Error(errors.join(" | ") || "Gagal memuat data logistik.");
  })();

  try {
    return await inFlightPromise;
  } finally {
    inFlightPromise = null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // 1. ENDPOINT UTAMA (Read-Only untuk Web App)
  app.get("/api/logistics-data", async (req, res) => {
    const force = req.query.force === "true" || req.query.force === "1";
    try {
      const payload = await getUnifiedLogisticsData(force);
      res.json(payload);
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        error: "Gagal memuat data logistik",
      });
    }
  });

  // 2. ENDPOINT WEBHOOK TERPROTEKSI (Wajib menggunakan SYNC_WEBHOOK_SECRET)
  app.post("/api/sync/webhook", (req, res) => {
    const expectedSecret = process.env.SYNC_WEBHOOK_SECRET;
    const providedSecret = req.headers["x-sync-secret"];

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return res.status(403).json({ error: "Forbidden: Invalid or missing webhook secret" });
    }

    const body = req.body;
    if (!body || !Array.isArray(body.onDutyRows)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const payload: LogisticsPayload = {
      status: "ok",
      source: "webhook-push",
      updatedAt: body.updatedAt || new Date().toISOString(),
      spreadsheetId: SPREADSHEET_ID,
      sheetNames: body.sheetNames || ["OnDuty", "Pengiriman", "Tren"],
      onDutyRows: body.onDutyRows || [],
      shippingRows: body.shippingRows || [],
      trendRows: body.trendRows || [],
      stats: {
        onDutyCount: Math.max(0, (body.onDutyRows || []).length - 1),
        shippingCount: (body.shippingRows || []).length,
        trendCount: (body.trendRows || []).length,
      },
    };

    memoryCache = payload;
    lastFetchTimestamp = Date.now();
    saveDiskSnapshot(payload);

    res.json({ status: "ok", stats: payload.stats });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
