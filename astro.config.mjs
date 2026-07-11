// @ts-check
import { defineConfig } from "astro/config";

// Static output — no adapter needed. The built ./dist is served by
// Cloudflare Workers Static Assets (see wrangler.jsonc).
// TODO: update `site` to your real domain once deployed.
export default defineConfig({
  site: "https://sizukutamago-portfolio.workers.dev",
  output: "static",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
});
