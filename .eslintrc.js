module.exports = {
  root: true,
  extends: [
    "airbnb-base",
    "plugin:prettier/recommended",
    "plugin:vue/essential",
    "@vue/typescript/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    parser: "babel-eslint",
    ecmaVersion: 2020,
    ecmaFeatures: {
      impliedStrict: true,
      classes: true,
    },
  },
  rules: {
    "prettier/prettier": [
      "error",
      {
        trailingComma: "es5",
        tabWidth: 2,
        semi: false,
        singleQuote: false,
        printWidth: 100,
      },
    ],
    quotes: [
      2,
      "double",
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    "func-names": 0,
    "no-new": 0,
    "prefer-destructuring": 1,
    "no-restricted-globals": 0,
    "no-plusplus": 0,
    "no-useless-escape": 0,
    "no-await-in-loop": 0,
    "no-console": 0,
    "no-param-reassign": [
      2,
      {
        props: false,
      },
    ],
    "no-useless-return": 0,
    "no-restricted-syntax": 0,
    "no-unused-vars": [
      1,
      {
        ignoreSiblings: true,
        argsIgnorePattern: "res|next|^err|reject|event",
      },
    ],
    "no-use-before-define": 0,
    "no-inner-declarations": 0,
  },
  globals: {
    browser: "readonly",
  },
  overrides: [
    {
      files: ["**/*.vue"],
      parser: "vue-eslint-parser",
    },
  ],
}
