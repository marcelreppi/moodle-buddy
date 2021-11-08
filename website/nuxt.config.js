export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: "static",

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: "Moodle Buddy | Mass file download and notifications for Moodle",
    htmlAttrs: {
      lang: "en",
    },
    link: [{ rel: "icon", type: "image/x-icon", href: "/mb.png" }],
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "format-detection", content: "telephone=no" },
      {
        hid: "description",
        name: "description",
        content:
          "Moodle Buddy offers mass file download and notification functionality for the Moodle learning management platform. Available for Firefox and Chrome.",
      },
      // Open Graph
      {
        name: "og:title",
        content: "Moodle Buddy | Mass file download and notifications for Moodle",
      },
      {
        name: "og:description",
        content:
          "Moodle Buddy offers mass file download and notification functionality for the Moodle learning management platform. Available for Firefox and Chrome.",
      },
      {
        name: "og:site_name",
        content: "Moodle Buddy | Mass file download and notifications for Moodle",
      },
      { name: "og:url", content: "https://moodlebuddy.com" },
      { name: "og:image", content: "https://moodlebuddy.com/mb-128.png" },
      { name: "og:image:width", content: "128" },
      { name: "og:image:height", content: "128" },
      // Twitter
      { name: "twitter:card", content: "summary" },
      { name: "twitter:creator", content: "@marcelreppi" },
    ],
    script: [
      {
        src: "https://umami.moodlebuddy.com/umami.js",
        async: true,
        defer: true,
        "data-website-id": "f0ddb47e-8e3c-46c7-87bd-1c077fefd501",
        "data-domains": "moodlebuddy.com",
      },
    ],
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://go.nuxtjs.dev/typescript
    "@nuxt/typescript-build",
    // https://go.nuxtjs.dev/tailwindcss
    "@nuxtjs/tailwindcss",
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {},
}
