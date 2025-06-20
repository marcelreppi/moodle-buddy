import { defineNuxtConfig } from "nuxt/config"
import { DESCRIPTION, DOMAIN, TITLE } from "./constants"
import { TRACKER_CONFIG } from "./umami.config"

export default defineNuxtConfig({
  app: {
    head: {
      title: TITLE,
      htmlAttrs: {
        lang: "en",
      },
      link: [{ rel: "icon", type: "image/png", href: "/mb.png" }],
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "format-detection", content: "telephone=no" },
        { hid: "description", name: "description", content: DESCRIPTION },
        // Open Graph
        { name: "og:title", content: TITLE },
        { name: "og:description", content: DESCRIPTION },
        { name: "og:site_name", content: TITLE },
        { name: "og:url", content: `https://${DOMAIN}` },
        { name: "og:image", content: `https://${DOMAIN}/mb-128.png` },
        { name: "og:image:width", content: "128" },
        { name: "og:image:height", content: "128" },
        // Twitter
        { name: "twitter:card", content: "summary" },
        { name: "twitter:creator", content: "@marcelreppi" },
      ],
      script: [
        {
          src: TRACKER_CONFIG.scriptSrc,
          async: true,
          defer: true,
          "data-website-id": TRACKER_CONFIG.websiteId,
          "data-domains": TRACKER_CONFIG.domain,
        },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
})
