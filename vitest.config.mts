/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx", "**/*.test.mjs"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "docs/**",
      "e2e/**",
      // De bronbestanden van opt-in modules; hun tests draaien in het gouden project.
      "template/modules/**",
      ".template-backup/**",
    ],
    environment: "node",
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
