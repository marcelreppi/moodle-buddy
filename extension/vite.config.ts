import { join } from "path"
import Vue from "@vitejs/plugin-vue"
import { defineConfig, UserConfig } from "vite"

const port = 3000
const isDev = process.env.NODE_ENV !== "production"
const r = (...additionalPaths) => join(__dirname, ...additionalPaths)

const sharedConfig: UserConfig = {
  root: r("src"),
  define: {
    __DEV__: isDev,
  },
  plugins: [Vue()],
}

export default defineConfig(({ command }) => ({
  ...sharedConfig,
  base: command === "serve" ? `http://localhost:${port}/` : "/build/",
  server: {
    port,
    hmr: {
      host: "localhost",
    },
  },
  build: {
    outDir: r("build"),
    sourcemap: isDev ? "inline" : false,
    rollupOptions: {
      input: {
        background: r("src/background/index.html"),
        options: r("src/options/index.html"),
        popup: r("src/popup/index.html"),
      },
    },
  },
  plugins: [
    ...sharedConfig.plugins!,

    // https://github.com/antfu/vite-plugin-windicss
    WindiCSS({
      config: windiConfig,
    }),
  ],
}))
