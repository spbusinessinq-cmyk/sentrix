import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const thisFileDir = path.dirname(fileURLToPath(import.meta.url));

  // Resolve frontend dist using the same multi-candidate strategy as app.ts
  const candidates = [
    path.resolve(thisFileDir, "..", "..", "vero-browser", "dist", "public"),
    path.resolve(process.cwd(), "artifacts", "vero-browser", "dist", "public"),
    path.resolve(
      path.dirname(path.resolve(process.argv[1] ?? ".")),
      "..",
      "..",
      "vero-browser",
      "dist",
      "public",
    ),
  ];

  const frontendDist = candidates.find((p) => fs.existsSync(p)) ?? null;
  const indexExists = frontendDist
    ? fs.existsSync(path.join(frontendDist, "index.html"))
    : false;

  res.json({
    status: "ok",
    env: process.env.NODE_ENV ?? "unknown",
    port: process.env.PORT ?? "unknown",
    nodeVersion: process.version,
    cwd: process.cwd(),
    frontendDist: frontendDist ?? "NOT FOUND",
    frontendIndexExists: indexExists,
    searchReady: true,
    sageReady: !!(
      process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"] ||
      process.env["AI_INTEGRATIONS_GEMINI_API_KEY"]
    ),
  });
});

export default router;
