import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Always bind to 0.0.0.0 so the server is reachable from outside the container.
// Node defaults to this when no host is specified, but being explicit prevents
// any platform or container policy from overriding to localhost-only.
app.listen(port, "0.0.0.0", () => {
  logger.info(
    {
      port,
      host: "0.0.0.0",
      env: process.env.NODE_ENV ?? "unknown",
      nodeVersion: process.version,
    },
    "[Sentrix] Server ready — listening on 0.0.0.0:" + port,
  );
});
