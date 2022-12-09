const { resolve } = require("path")
const fs = require("fs")
const chokidar = require("chokidar")
const getManifest = require("../src/manifest.js")
const { IS_DEV } = require("./utils")

function writeManifest() {
  const manifest = getManifest()
  const outputPath = resolve(__dirname, "..", "src", "manifest.json")
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2))
  console.log("Writing manifest.json")
}

writeManifest()

if (IS_DEV) {
  chokidar
    .watch([
      resolve(__dirname, "..", "src", "manifest.js"),
      resolve(__dirname, "..", "package.json"),
    ])
    .on("change", writeManifest)
}

module.exports = {
  writeManifest,
}
