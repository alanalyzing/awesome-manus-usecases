import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { rateLimit } from "./rateLimit";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { apiRouter } from "../apiSubmit";
import { rssRouter } from "../rssFeed";
import { updateRouter } from "../apiUpdate";
import { extensionRouter } from "../apiExtension";
import { sitemapRouter } from "../sitemap";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy for /manus-storage/* paths
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Rate limiting for API endpoints
  app.use("/api/trpc", rateLimit({
    name: "trpc",
    windowMs: 60_000, // 1 minute
    max: 120, // 120 requests per minute per IP
    message: "Too many API requests. Please slow down.",
  }));
  app.use("/api/submit", rateLimit({
    name: "submit",
    windowMs: 3600_000, // 1 hour
    max: 30, // 30 submissions per hour per IP
    message: "Too many submissions. Please try again later.",
    skipLocalhost: process.env.NODE_ENV === "development",
  }));
  // Public API routes (for programmatic submission)
  app.use("/api", apiRouter);
  app.use("/api", rssRouter);
  app.use("/api", updateRouter);
  app.use("/api", extensionRouter);
  // Sitemap for SEO
  app.use(sitemapRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
