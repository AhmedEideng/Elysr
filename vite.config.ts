import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // 🔧 تقسيم vendor — بدون circular dependency
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React Core + scheduler + use-sync-external-store (كلها مترابطة)
          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("scheduler") ||
            id.includes("use-sync-external-store")
          ) {
            return "vendor-react";
          }

          // مكتبة التوجيه
          if (id.includes("@tanstack")) {
            return "vendor-router";
          }

          // أيقونات (تحميل كسول)
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

          // بحث fuzzy
          if (id.includes("fuse.js")) {
            return "vendor-search";
          }

          // إشعارات
          if (id.includes("sonner")) {
            return "vendor-toast";
          }
        },
      },
    },
  },
});
