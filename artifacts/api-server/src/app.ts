import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Allow any origin — Sentrix API is a public-read intelligence endpoint.
// In production this permits the deployed frontend (e.g. sentrix.live) to
// call /api/* without CORS preflight failures.
app.use(
  cors({
    origin: true,           // reflect the request origin (works for any domain)
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,     // no cookies/auth headers sent cross-origin
  }),
);

// Security hygiene — prevent MIME-type sniffing so that index.html can
// never be misinterpreted as JSON if routing is misconfigured.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
