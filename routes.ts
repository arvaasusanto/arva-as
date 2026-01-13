import type { Express } from "express";
import type { Server } from "http";

/**
 * Semua routing API didefinisikan di sini
 * Akan dipanggil sekali oleh index.ts (initOnce)
 */
export async function registerRoutes(
  _server: Server,
  app: Express,
): Promise<void> {
  // contoh health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
    });
  });

  // contoh endpoint lain
  app.get("/api/hello", (_req, res) => {
    res.json({ message: "Hello from API 👋" });
  });
}
