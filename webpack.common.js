const { join } = require("path")
const CopyPlugin = require("copy-webpack-plugin")
const { VueLoaderPlugin } = require("vue-loader")

const polyfills = ["core-js/stable", "regenerator-runtime/runtime"]

const getBackgroundEntry = filename => {
  return polyfills.concat(join(__dirname, "extension", "background_scripts", filename))
}

const getContentEntry = filename => {
  return polyfills.concat(join(__dirname, "extension", "content_scripts", filename))
}

module.exports = {
  entry: {
    "popup/app.bundle": join(__dirname, "extension", "src", "index.js"),
    "background_scripts/downloader": getBackgroundEntry("downloader.js"),
    "content_scripts/crawler": getContentEntry("crawler.js"),
    "content_scripts/startPage": getContentEntry("startPage.js"),
  },
  output: {
    path: join(__dirname, "build"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env"],
        },
      },
      {
        test: /\.vue$/,
        use: "vue-loader",
      },
      {
        test: /\.css$/,
        use: ["vue-style-loader", "css-loader"],
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "/popup/images",
              publicPath: "/popup/images",
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new CopyPlugin([
      { from: "./extension/manifest.json", to: "./manifest.json" },
      { from: "./extension/popup", to: "./popup" },
      { from: "./extension/pages", to: "./pages" },
      { from: "./extension/shared", to: "./shared" },
      { from: "./extension/icons", to: "./icons" },
    ]),
  ],
}
