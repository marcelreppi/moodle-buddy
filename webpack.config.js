const { join } = require("path")
const webpack = require("webpack")
const CopyPlugin = require("copy-webpack-plugin")
const { VueLoaderPlugin } = require("vue-loader")
const TerserPlugin = require("terser-webpack-plugin")
const DotenvPlugin = require("dotenv-webpack")

const isProd = process.env.NODE_ENV === "production"

console.log(`Webpack is in ${process.env.NODE_ENV} mode`)

const polyfills = ["core-js/stable", "regenerator-runtime/runtime"]

const backgroundEntry = filename => {
  return polyfills.concat(join(__dirname, "extension", "background_scripts", filename))
}

const contentEntry = filename => {
  return polyfills.concat(join(__dirname, "extension", "content_scripts", filename))
}

module.exports = {
  entry: {
    "popup/app.bundle": join(__dirname, "extension", "popup", "index.js"),
    "content_scripts/coursePage": contentEntry("coursePage.js"),
    "content_scripts/startPage": contentEntry("startPage.js"),
    "background_scripts/downloader": backgroundEntry("downloader.js"),
    "background_scripts/extension-listener": backgroundEntry("extension-listener.js"),
  },
  output: {
    path: join(__dirname, "build"),
    filename: "[name].js",
  },
  mode: isProd ? "production" : "development",
  devtool: isProd ? "source-map" : "inline-source-map",
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
        loader: "image-webpack-loader",
        enforce: "pre",
        options: {
          mozjpeg: {
            progressive: true,
            quality: 50,
          },
          // optipng.enabled: false will disable optipng
          optipng: {
            enabled: false,
          },
          pngquant: {
            quality: [0.3, 0.65],
            speed: 6,
          },
        },
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 10 * 1024,
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
      { from: "./extension/popup/index.html", to: "./popup/index.html" },
      { from: "./extension/pages", to: "./pages" },
      { from: "./extension/shared", to: "./shared" },
      { from: "./extension/icons", to: "./icons" },
    ]),
    new webpack.EnvironmentPlugin(["NODE_ENV"]), // Make process.env.NODE_ENV available in code
    new DotenvPlugin(), // Load environment variables from .env file
  ],
  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        sourceMap: true,
      }),
    ],
  },
}
