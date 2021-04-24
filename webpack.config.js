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
  "popup/app.bundle": ["@babel/polyfill", join(__dirname, "extension", "popup", "main.ts")],
}

// Content scripts
const addContentEntry = filename => {
  const [filenameWithoutExtension] = filename.split(".")
  const inputPath = polyfills.concat(join(__dirname, "extension", "content-scripts", filename))
  const outputPath = `content-scripts/${filenameWithoutExtension}`
  entries[outputPath] = inputPath
}

addContentEntry("coursePage.ts")
addContentEntry("dashboardPage.ts")
addContentEntry("videoservicePage.ts")
addContentEntry("detector.ts")

// Background scripts
const addBackgroundEntry = filename => {
  const [filenameWithoutExtension] = filename.split(".")
  const inputPath = polyfills.concat(join(__dirname, "extension", "background-scripts", filename))
  const outputPath = `background-scripts/${filenameWithoutExtension}`
  entries[outputPath] = inputPath
}

addBackgroundEntry("downloader.ts")
addBackgroundEntry("extensionListener.ts")
addBackgroundEntry("backgroundScanner.ts")

// Page scripts
const addPageEntry = filename => {
  const [filenameWithoutExtension] = filename.split(".")
  const inputPath = polyfills.concat(
    join(__dirname, "extension", "pages", filenameWithoutExtension, filename)
  )
  const outputPath = `pages/${filenameWithoutExtension}/${filenameWithoutExtension}`
  entries[outputPath] = inputPath
}

addPageEntry("contact.ts")
addPageEntry("information.ts")
addPageEntry("install.ts")
// addPageEntry("legal.ts")
addPageEntry("options.ts")
addPageEntry("update.ts")

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
        { from: "./extension/manifest.json", to: "./manifest.json" },
        { from: "./extension/popup/index.html", to: "./popup/index.html" },
        { from: "./extension/pages", to: "./pages", globOptions: { ignore: ["**/*.ts"] } },
        { from: "./extension/shared", to: "./shared" },
        { from: "./extension/icons", to: "./icons" },
        { from: "./screenshots", to: "./screenshots" },
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
