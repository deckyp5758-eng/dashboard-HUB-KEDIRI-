import express from "express";
import path from "path";
import axios from "axios";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to proxy Google Sheets API
  app.get("/api/sheets/:spreadsheetId/metadata", async (req, res) => {
    const { spreadsheetId } = req.params;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API Key missing" });
    }

    try {
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`
      );
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sheets/:spreadsheetId/:range", async (req, res) => {
    const { spreadsheetId, range } = req.params;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API Key missing" });
    }

    try {
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`
      );
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
