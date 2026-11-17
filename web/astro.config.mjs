// @ts-check
import { defineConfig } from "astro/config";

// Served at the root of loadstore.xyz (GitHub Pages custom domain). CI sets SITE_BASE
// from the Pages base path, which is empty for a custom domain; locally it's "/" too.
export default defineConfig({
  base: process.env.SITE_BASE || "/",
  trailingSlash: "ignore",
  build: { format: "directory" },
  // Fetch a page as soon as a link is hovered or tapped, so navigating feels instant.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
});
