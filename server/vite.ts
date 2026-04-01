import type { Express } from "express";

export async function setupVite(app: Express) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: "vite.config.ts",
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
