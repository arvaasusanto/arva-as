import type { Express } from "express";
import path from "path";
import fs from "fs";

export function serveStatic(app: Express) {
  const publicDir = path.resolve(process.cwd(), "public");

  // 🔐 Safety check (INI YANG SERING TERLUPA)
  if (!fs.existsSync(publicDir)) {
    console.warn("⚠️ No public directory found, skipping static serve");
    return;
  }

  app.use(express.static(publicDir));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}
