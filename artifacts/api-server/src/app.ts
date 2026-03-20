import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import http from "http";
import { fileURLToPath } from "url";
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
// Belt-and-suspenders: enforce JSON Content-Type for all /api/* responses.
app.use("/api", (req, res, next) => {
  const origSend = res.send.bind(res);
  // @ts-ignore — intercept raw send to catch accidental HTML responses
  res.send = function (body: unknown) {
    if (!res.headersSent) {
      const ct = res.getHeader("Content-Type") as string | undefined;
      if (!ct || ct.includes("text/html")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
    }
    return origSend(body);
  };
  next();
});
app.use("/api", router);

// ── Catch any /api/* path that the router didn't handle — return JSON 404 ─────
// This MUST be placed after the router so it only fires for unmatched routes.
app.use("/api", (req, res) => {
  res
    .status(404)
    .json({ error: "API route not found", path: req.path, method: req.method });
});

// ── Production: serve the Vite-built frontend from the same process ───────────
//
// Path resolution strategy (most-reliable-first):
//
//   1. Derived from import.meta.url — esbuild transforms this to the OUTPUT
//      file's URL at bundle time, so at runtime it always resolves to
//      dist/index.cjs's directory, regardless of process.cwd().
//      dist/ → ../../vero-browser/dist/public
//
//   2. Derived from process.cwd() — works when Replit starts the server
//      from the workspace root (the normal case).
//
//   3. Derived from process.argv[1] — the path to the entry script.
//
// We check all three and use the first one that actually exists on disk.
// This makes the server robust to CWD changes and different deployment modes.
//
if (isProduction) {
  const thisFileDir = path.dirname(fileURLToPath(import.meta.url));

  const candidates = [
    // 1. Relative to built bundle (dist/index.cjs → artifacts/api-server/dist)
    path.resolve(thisFileDir, "..", "..", "vero-browser", "dist", "public"),
    // 2. Relative to workspace root via cwd
    path.resolve(process.cwd(), "artifacts", "vero-browser", "dist", "public"),
    // 3. Relative to the script being executed
    path.resolve(
      path.dirname(path.resolve(process.argv[1] ?? ".")),
      "..",
      "..",
      "vero-browser",
      "dist",
      "public",
    ),
  ];

  let frontendDist = candidates[0];
  let found = false;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      frontendDist = candidate;
      found = true;
      logger.info(
        { frontendDist, strategy: candidates.indexOf(candidate) + 1 },
        "[Sentrix] Production: frontend dist directory found",
      );
      break;
    }
  }

  if (!found) {
    logger.error(
      { tried: candidates },
      "[Sentrix] CRITICAL: frontend dist not found — static files will 404. " +
        "Check that vero-browser build ran before api-server build.",
    );
  }

  // Serve static assets (JS, CSS, images) with long cache TTL.
  // index: false prevents Express from auto-serving index.html for /
  // (we do that ourselves in the SPA fallback so /api/* never matches first).
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

  // SPA fallback — all remaining paths return index.html.
  // /api/* has already been handled above; this will never fire for them.
  app.use((req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(frontendDist, "index.html"), (err) => {
      if (err && !res.headersSent) {
        res
          .status(500)
          .json({ error: "SPA entry file not found — frontend not built" });
      }
    });
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
