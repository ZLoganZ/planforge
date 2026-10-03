import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintPluginTailwindcss from "eslint-plugin-tailwindcss";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  eslintPluginTailwindcss.configs["flat/recommended"] ||
    eslintPluginTailwindcss.configs.recommended,
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    settings: {
      tailwindcss: {
        // Point to the Tailwind v4 CSS entry so ordering rules use the real config.
        cssConfigPath: "./src/app/globals.css",
      },
    },
    rules: {
      // Tailwind v4 uses CSS-variable-based opacity modifiers (e.g. bg-muted/50,
      // ring-ring/50, aria-invalid:border-destructive) that eslint-plugin-tailwindcss
      // does not yet recognise. Disable to eliminate false-positive warnings.
      "tailwindcss/no-custom-classname": "off",
    },
  },
]);

export default eslintConfig;
