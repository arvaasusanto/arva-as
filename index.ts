import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  } as any;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// ---- Vercel init-once ----
let inited = false;
let initPromise: Promise<void> | null = null;

async function initOnce() {
  if (inited) return;
  if (!initPromise) {
    initPromise = (async () => {
      await registerRoutes(httpServer, app);

      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err?.status || err?.statusCode || 500;
        const message = err?.message || "Internal Server Error";
        if (!res.headersSent) res.status(status).json({ message });
        // jangan throw di serverless
      });

      if (process.env.NODE_ENV === "production") {
        serveStatic(app);
      } else {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
      }

      inited = true;
    })();
  }
  await initPromise;
}

// ✅ Serverless handler untuk Vercel
export default async function handler(req: any, res: any) {
  await initOnce();
  return app(req, res);
}
