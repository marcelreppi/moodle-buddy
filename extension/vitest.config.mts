import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@types": fileURLToPath(new URL("./src/types", import.meta.url)),
      models: fileURLToPath(new URL("./src/models", import.meta.url)),
      types: fileURLToPath(new URL("./src/types/index.ts", import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
  },
})
