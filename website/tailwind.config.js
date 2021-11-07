module.exports = {
  purge: [
    "./components/**/*.{vue,js}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
  ],
  darkMode: false, // or 'media' or 'class'
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
