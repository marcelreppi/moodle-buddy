import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@shared": `${sourceDirectory}/shared`,
      "@types": `${sourceDirectory}/types`,
      types: `${sourceDirectory}/types`,
    },
  },
})
