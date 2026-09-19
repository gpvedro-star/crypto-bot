import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // `.netlify/` holds the Netlify CLI's local build output, not source.
  globalIgnores([".next/**", "out/**", ".netlify/**", "node_modules/**", "next-env.d.ts"]),
]);
