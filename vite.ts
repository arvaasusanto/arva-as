import type { Express } from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

/**
 * Dev-only Vite middleware.
 * - Tidak import named dari `vite` di top-level agar tidak kena TS2305 (beda versi/types).
 * - Tidak import ../vite.config agar tidak kena TS2307 kalau file/tipe tidak ada.
 */
export async function setupVite(server: Server, app: Express) {
  // Dynamic import: aman untuk production (tidak dieksekusi saat NODE_ENV=production).
  const viteMod: any = await import("vite");
  const createViteServer = viteMod.createServer ?? viteMod.createViteServer;
  const createLogger = viteMod.createLogger;

  if (typeof createViteServer !== "function") {
    throw new Error(
      "Vite API tidak ditemukan. Pastikan package `vite` terpasang (devDependency) dan versinya sesuai.",
    );
  }

  const viteLogger = typeof createLogger === "function" ? createLogger() : console;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    // Biarkan Vite mencari config dari cwd jika ada.
    // Kalau kamu punya vite.config.ts/js, Vite akan membacanya otomatis.
    configFile: false,
    server: serverOptions,
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg: unknown, options?: unknown) => {
        (viteLogger as any).error?.(msg as any, options as any);
        process.exit(1);
      },
    },
  });

  app.use((vite as any).middlewares);

  app.use("*", async (req, res, next) => {
    const url = (req as any).originalUrl ?? req.url;

    try {
      const clientTemplate = path.resolve(process.cwd(), "client", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      const page = await (vite as any).transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      (vite as any).ssrFixStacktrace?.(e as Error);
      next(e);
    }
  });
}
