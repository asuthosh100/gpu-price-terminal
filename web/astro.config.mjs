// @ts-check
import { defineConfig } from "astro/config";

// GitHub Pages serves a project site under /<repo>/. CI sets SITE_BASE to that path;
// locally the site runs at the root.
export default defineConfig({
  base: process.env.SITE_BASE || "/",
  trailingSlash: "ignore",
  build: { format: "directory" },
  // Fetch a page as soon as a link is hovered or tapped, so navigating feels instant.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
});
