const { join } = require("path")
const CopyPlugin = require("copy-webpack-plugin")
const { VueLoaderPlugin } = require("vue-loader")

module.exports = {
  mode: "development",
  devtool: "inline-source-map",
  entry: {
    "popup/app.bundle": join(__dirname, "extension", "src", "index.js"),
    // "background_scripts/downloader": join(
    //   __dirname,
    //   "extension",
    //   "background_scripts",
    //   "downloader.js"
    // ),
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
      { from: "./extension/background_scripts", to: "./background_scripts" },
      { from: "./extension/content_scripts", to: "./content_scripts" },
      { from: "./extension/pages", to: "./pages" },
      { from: "./extension/shared", to: "./shared" },
      { from: "./extension/icons", to: "./icons" },
    ]),
  ],
}
