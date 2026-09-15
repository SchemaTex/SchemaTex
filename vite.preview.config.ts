import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";

/** Vite's MPA mode 404s on a directory path without a trailing slash, so
 *  /eval comes back blank while /eval/ works. Redirect, but only
 *  for paths that really are a directory holding an index.html — Vite's own
 *  internals (/@vite/client and friends) are not directories. */
const redirectDirectories = {
  name: "redirect-directories",
  configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
    server.middlewares.use((req: { url?: string }, res: { writeHead: (n: number, h: Record<string, string>) => void; end: () => void }, next: () => void) => {
      const url = req.url ?? "";
      const path = url.split(/[?#]/)[0] ?? "";
      if (path && !path.endsWith("/") && !path.startsWith("/@") &&
          existsSync(join(process.cwd(), path, "index.html"))) {
        res.writeHead(301, { Location: path + "/" + url.slice(path.length) });
        res.end();
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [redirectDirectories],
  appType: "mpa",
  // The Visual Eval tool is written in TSX; esbuild's automatic JSX runtime
  // handles it without pulling in a React plugin.
  esbuild: { jsx: "automatic" },
  server: { host: "0.0.0.0" },
});
