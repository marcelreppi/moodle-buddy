/* eslint-disable @typescript-eslint/no-var-requires */
const { join } = require("path")
const webpack = require("webpack")
const CopyPlugin = require("copy-webpack-plugin")
const { VueLoaderPlugin } = require("vue-loader")
const TerserPlugin = require("terser-webpack-plugin")
const Dotenv = require("dotenv-webpack")

const isProd = process.env.NODE_ENV === "production"

console.log(`Webpack is in ${process.env.NODE_ENV} mode`)

const polyfills = ["core-js/stable", "regenerator-runtime/runtime"]

const entries = {
  "popup/app.bundle": ["@babel/polyfill", join(__dirname, "src", "popup", "main.ts")],
}

const addExtensionEntry = (pathToFile) => {
  const pathElements = pathToFile.split("/")
  const [filenameWithoutExtension] = pathElements[pathElements.length - 1].split(".")
  const inputPath = polyfills.concat(join(__dirname, "src", ...pathElements))
  const outputPath = [...pathElements.slice(0, -1), filenameWithoutExtension].join("/")
  entries[outputPath] = inputPath
}

addExtensionEntry("content-scripts/index.ts")
addExtensionEntry("content-scripts/coursePage.ts")
addExtensionEntry("content-scripts/dashboardPage.ts")
addExtensionEntry("content-scripts/videoservicePage.ts")

addExtensionEntry("background-scripts/downloader.ts")
addExtensionEntry("background-scripts/extensionListener.ts")
addExtensionEntry("background-scripts/backgroundScanner.ts")

addExtensionEntry("pages/contact/contact.ts")
addExtensionEntry("pages/information/information.ts")
addExtensionEntry("pages/install/install.ts")
// addExtensionEntry("pages/legal/legal.ts")
addExtensionEntry("pages/options/options.ts")
addExtensionEntry("pages/update/update.ts")

module.exports = {
  entry: entries,
  output: {
    path: join(__dirname, "build"),
    filename: "[name].js",
  },
  mode: isProd ? "production" : "development",
  devtool: isProd ? undefined : "inline-source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: {
          appendTsSuffixTo: [/\.vue$/],
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [["@babel/preset-env", { targets: "defaults" }]],
          },
        },
      },
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.css$/,
        use: ["vue-style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[hash][ext][query]",
        },
      },
    ],
  },
  node: {
    global: false,
  },
  resolve: {
    alias: {
      vue: "@vue/runtime-dom",
    },
    extensions: ["*", ".js", ".ts", ".vue", ".json"],
  },
  plugins: [
    new VueLoaderPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "./src/manifest.json", to: "./manifest.json" },
        { from: "./src/popup/index.html", to: "./popup/index.html" },
        {
          from: "node_modules/webextension-polyfill/dist/browser-polyfill.js",
          to: "./shared/browser-polyfill.js",
        },
        { from: "./src/pages", to: "./pages", globOptions: { ignore: ["**/*.ts"] } },
        { from: "./src/icons", to: "./icons" },
        { from: "../screenshots", to: "./screenshots" },
      ],
    }),
    new Dotenv({
      path: isProd ? ".env" : ".env.dev",
    }),
    new webpack.EnvironmentPlugin(["NODE_ENV"]), // Make process.env.NODE_ENV available in code
    new webpack.DefinePlugin({
      global: "window", // Placeholder for global used in any node_modules
    }),
  ],
  optimization: {
    minimize: isProd,
    minimizer: [new TerserPlugin()],
  },
}
