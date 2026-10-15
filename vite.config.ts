import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const apiTarget = `http://localhost:${process.env.PORT ?? 4000}`;

export default defineConfig(({ mode }) => {
  const siteVersion = loadEnv(mode, process.cwd(), "").SITE_VERSION?.trim() || "v1";
  if (siteVersion !== "v0" && siteVersion !== "v1" && siteVersion !== "v2") {
    throw new Error(`SITE_VERSION must be "v0", "v1" or "v2" (got "${siteVersion}").`);
  }

  return {
    define: { __SITE_VERSION__: JSON.stringify(siteVersion) },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/api": apiTarget,
        "/uploads": apiTarget,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return "motion";
            if (/node_modules[\\/](react|react-dom|react-router|scheduler|cookie|set-cookie-parser)[\\/]/.test(id)) return "react";
          },
        },
      },
    },
  };
});
