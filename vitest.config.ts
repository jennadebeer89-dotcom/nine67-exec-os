import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The engine imports via the `@/` alias (e.g. `@/data/raw`), so tests need it too.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
