import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    /**
     * (2026-11-14) ملفات JS الخادمية والسكربتات كانت **غير مُفحوصة إطلاقًا**:
     * كتلة TS أعلاه محدودة بامتدادات ts/tsx فقط، فـ api/ وserver/ و
     * scripts/ وpublic/scripts/ وconfig/ (34 ملفًا — أكثر من ثلث الشيفرة)
     * كانت تمر بلا ESLint. أخطاء مثل متغير غير معرّف أو await داخل دالة غير
     * async كانت تصل للإنتاج بلا أي حاجز.
     */
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // سكربتات البناء تتعامل مع كائنات من ssrLoadModule/JSON بلا أنواع.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      /**
       * no-useless-assignment (قاعدة جديدة في ESLint 10) تعلّم على 7 مواضع
       * قديمة كلها نمط واحد: `let x = default;` ثم إسناد مشروط داخل try أو
       * if — والقراءة تحدث في مسار لاحق. القاعدة صحيحة شكليًا لكن إصلاحها
       * يعني لمس منطق API حسّاس (submit-order/submit-review) مقابل لا شيء
       * سلوكي. نُبقيها تحذيرًا بدل خطأ حتى لا يُغلق الباب، ونصلحها عند أول
       * تعديل حقيقي في تلك الملفات.
       */
      "no-useless-assignment": "warn",
    },
  },
  {
    // TanStack Router route modules intentionally export the generated `Route`
    // object beside their page components; its Vite plugin owns route HMR.
    files: ["src/routes/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  eslintPluginPrettier,
);
