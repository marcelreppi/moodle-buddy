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
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        moodlebuddy: {
          primary: "#c50e20",
          "primary-focus": "#4506cb",
          "primary-content": "#ffffff",

          secondary: "#57086d",
          "secondary-focus": "#bd0091",
          "secondary-content": "#ffffff",

          accent: "#37cdbe",
          "accent-focus": "#2ba69a",
          "accent-content": "#ffffff",

          neutral: "#3b424e",
          "neutral-focus": "#2a2e37",
          "neutral-content": "#ffffff",

          "base-100": "#ffffff",
          "base-200": "#f9fafb",
          "base-300": "#ced3d9",
          "base-content": "#1e2734",

          info: "#1c92f2",
          success: "#009485",
          warning: "#ff9900",
          error: "#ff5724",

          "--rounded-box": "1rem",
          "--rounded-btn": ".5rem",
          "--rounded-badge": "1.9rem",

          "--animation-btn": ".25s",
          "--animation-input": ".2s",

          "--btn-text-case": "uppercase",
          "--navbar-padding": ".5rem",
          "--border-btn": "1px",
        },
      },
    ],
  },
}
