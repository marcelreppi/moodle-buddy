module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        "mb-red": "#c50e20",
      },
    },
  },
  variants: {
    extend: {
      textColor: ["visited"],
      cursor: ["hover", "focus"],
    },
  },
  plugins: [],
}
