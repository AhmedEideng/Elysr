import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
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
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    // 🚀 Target modern browsers for smaller, faster code
    target: "es2022",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // 🔧 تقسيم الملفات الكبيرة والـ vendor
        manualChunks(id) {
          // 🚀 تقسيم ملفات البيانات الضخمة لمنع بلوت index.js
          // تقسيم الكتالوج لكل فئة على حدة بحيث يُحمّل فقط ملف القسم
          // الذي يحتاجه المستخدم (men/women/devices) بدلاً من كل المنتجات
          // معاً في chunk واحد ضخم — يحسّن زمن التحميل (LCP) للأقسام والهوم.
          if (id.includes("src/data/products/men")) {
            return "data-catalog-men";
          }
          if (id.includes("src/data/products/women")) {
            return "data-catalog-women";
          }
          if (id.includes("src/data/products/devices")) {
            return "data-catalog-devices";
          }
          if (id.includes("src/data/products")) {
            return "data-catalog";
          }
          // مقالات التوعية (تحت الطيّة فقط → تُحمّل كسولاً، بعيداً عن المسار الحرج)
          if (id.includes("src/data/articles")) {
            return "data-articles";
          }
          // صفحات اللاندينج (تُجلب الآن كملفات JSON فردية وقت الزيارة → لا تُدمج في أي bundle)
          if (id.includes("src/data/landing-pages")) {
            return "data-landing";
          }

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
