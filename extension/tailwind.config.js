module.exports = {
  content: ["./src/**/*.{vue,js,ts,html}"],
  theme: {
    extend: {
      colors: {
        "mb-red": "#c50e20",
        "mb-red-light": "#cf293a",
      },
      boxShadow: {
        custom: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
      },
    },
  },
  variants: {
    extend: {
      cursor: ["disabled", "hover", "focus"],
      backgroundColor: ["disabled"],
    },
  },
  plugins: [],
}
