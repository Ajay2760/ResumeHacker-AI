import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path, { dirname, join } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

/**
 * Resolve the Vite build output (`resume-ai/dist/public`). On hosts like Render,
 * `process.cwd()` is often the repo root (or another directory), so a path
 * relative to cwd breaks SPA static hosting and deep links show a blank page.
 */
function resolveFrontendDist(): string | undefined {
  const fromEnv = process.env.FRONTEND_DIST?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }

  const bundleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(bundleDir, "..", "..", "resume-ai", "dist", "public"),
    path.resolve(process.cwd(), "artifacts", "resume-ai", "dist", "public"),
    path.resolve(process.cwd(), "../resume-ai/dist/public"),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  return undefined;
}

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const frontendDist = resolveFrontendDist();
  if (frontendDist) {
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  } else {
    logger.warn(
      "Production frontend dist not found (expected resume-ai/dist/public). " +
        "Build the resume-ai package before api-server, or set FRONTEND_DIST.",
    );
  }
}

export default app;
