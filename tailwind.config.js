module.exports = {
  purge: ["./extension/**/*.{vue,js,ts,jsx,tsx,html}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        "mb-red": "#c50e20",
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
