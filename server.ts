import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(__dirname, 'src', 'data.json');

  app.use(express.json());

  // API routes
  app.get("/api/data", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error) {
      console.error('Error reading data file:', error);
      res.status(500).json({ error: 'Failed to read data' });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const { classes, students, records } = req.body;
      if (!classes || !students) {
        return res.status(400).json({ error: 'Invalid data format' });
      }
      await fs.writeFile(DATA_FILE, JSON.stringify({ classes, students, records: records || {} }, null, 2), 'utf-8');
      res.json({ success: true });
    } catch (error) {
      console.error('Error writing data file:', error);
      res.status(500).json({ error: 'Failed to save data' });
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
