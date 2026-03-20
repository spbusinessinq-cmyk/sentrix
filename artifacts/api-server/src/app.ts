import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import http from "http";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const isProduction = process.env.NODE_ENV === "production";

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API routes — registered BEFORE static/proxy so /api/* never falls through ─
app.use("/api", router);

// ── Production: serve the Vite-built frontend from the same process ───────────
// The server is started from workspace root as:
//   node artifacts/api-server/dist/index.cjs
// so process.cwd() = workspace root. The frontend is built to
// artifacts/vero-browser/dist/public before this build runs
// (see artifact.toml production build command).
if (isProduction) {
  const frontendDist = path.join(
    process.cwd(),
    "artifacts",
    "vero-browser",
    "dist",
    "public",
  );

  logger.info({ frontendDist }, "[Sentrix] Production: serving frontend static files");

  app.use(
    express.static(frontendDist, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // SPA fallback — all non-API, non-static-file paths return index.html.
  // Belt-and-suspenders: if somehow /api/* reaches here, return clear JSON.
  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "API route not found", path: req.path });
      return;
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ── Development: proxy non-API requests to the Vite dev server ───────────────
// When api-server owns paths=["/"] in the Replit workspace, all browser
// requests route here. We stream them to the Vite dev server so HMR,
// live-reload, and asset serving work normally.
if (!isProduction) {
  const VITE_PORT = Number(process.env.VITE_DEV_PORT ?? 22442);

  app.use((req, res) => {
    const options: http.RequestOptions = {
      hostname: "localhost",
      port: VITE_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${VITE_PORT}` },
    };

    const proxy = http.request(options, (viteRes) => {
      res.writeHead(viteRes.statusCode ?? 200, viteRes.headers);
      viteRes.pipe(res, { end: true });
    });

    proxy.on("error", () => {
      if (!res.headersSent) {
        res.status(502).send(
          `<pre style="font-family:monospace;padding:2rem">` +
          `Dev proxy: Vite dev server not reachable at port ${VITE_PORT}.\n` +
          `Make sure the 'artifacts/vero-browser: web' workflow is running.\n` +
          `API routes at /api/* are always handled directly by this server.</pre>`,
        );
      }
    });

    req.pipe(proxy, { end: true });
  });
}

export default app;
