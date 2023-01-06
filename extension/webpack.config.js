/* eslint-disable @typescript-eslint/no-var-requires */
const { join } = require("path")
const webpack = require("webpack")
const CopyPlugin = require("copy-webpack-plugin")
const { VueLoaderPlugin } = require("vue-loader")
const TerserPlugin = require("terser-webpack-plugin")
const Dotenv = require("dotenv-webpack")
const CreateFileWebpack = require("create-file-webpack")
const WatchExternalFilesPlugin = require("webpack-watch-external-files-plugin")

const { IS_PROD } = require("./scripts/utils")
const getManifest = require("./src/manifest")

const BUILD_DIR = join(__dirname, "build")

console.log(`Webpack is in ${process.env.NODE_ENV || "development"} mode`)

const entries = {
  "popup/app.bundle": [join(__dirname, "src", "popup", "main.ts")],
}

const addExtensionEntry = (pathToFile, customOutputPath) => {
  const pathElements = pathToFile.split("/")
  const [filenameWithoutExtension] = pathElements[pathElements.length - 1].split(".")
  const inputPath = join(__dirname, "src", ...pathElements)
  const outputPath = customOutputPath ?? [...pathElements.slice(0, -1), filenameWithoutExtension].join("/")
  entries[outputPath] = inputPath
}

addExtensionEntry("content-scripts/index.ts")
addExtensionEntry("content-scripts/coursePage.ts")
addExtensionEntry("content-scripts/dashboardPage.ts")
addExtensionEntry("content-scripts/videoservicePage.ts")

// addExtensionEntry("background-scripts/downloader.ts")
// addExtensionEntry("background-scripts/extensionListener.ts")
// addExtensionEntry("background-scripts/backgroundScanner.ts")
addExtensionEntry("background-scripts/index.ts", "background")

addExtensionEntry("pages/contact/contact.ts")
addExtensionEntry("pages/information/information.ts")
addExtensionEntry("pages/install/install.ts")
// addExtensionEntry("pages/legal/legal.ts")
addExtensionEntry("pages/options/options.ts")
addExtensionEntry("pages/update/update.ts")

module.exports = {
  entry: entries,
  output: {
    path: BUILD_DIR,
    filename: "[name].js",
  },
  mode: IS_PROD ? "production" : "development",
  devtool: IS_PROD ? undefined : "inline-source-map",
  watch: !IS_PROD,
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
      canvas: "./canvas-shim.cjs",
      perf_hooks: false,
    },
    extensions: ["*", ".js", ".ts", ".vue", ".json"],
  },
  plugins: [
    new VueLoaderPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "./src/popup/index.html", to: "./popup/index.html" },
        { from: "./src/pages", to: "./pages", globOptions: { ignore: ["**/*.ts"] } },
        { from: "./src/icons", to: "./icons" },
        { from: "../screenshots", to: "./screenshots" },
      ],
    }),
    new Dotenv({
      path: IS_PROD ? ".env" : ".env.dev",
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: "development",
    }), // Make process.env.NODE_ENV available in code
    new webpack.DefinePlugin({
      global: "window", // Placeholder for global used in any node_modules
    }),
    new CreateFileWebpack({
      path: BUILD_DIR,
      fileName: "manifest.json",
      content: JSON.stringify(getManifest(), null, 2),
    }),
  ],
  optimization: {
    minimize: IS_PROD,
    minimizer: [new TerserPlugin()],
  },
}
