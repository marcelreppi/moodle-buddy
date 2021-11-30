import fs from "fs-extra"
import { Manifest } from "webextension-polyfill"
import type PkgType from "../package.json"
import { isDev, port, r } from "../scripts/utils"

export async function getManifest() {
  const pkg = (await fs.readJSON(r("package.json"))) as typeof PkgType

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 2,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    browser_action: {
      default_icon: {
        "16": "icons/16-gray.png",
        "32": "icons/32-gray.png",
        "48": "icons/48-gray.png",
        "128": "icons/128-gray.png",
      },
      default_title: "Moodle Buddy",
      default_popup: "popup/index.html",
    },
    options_ui: {
      page: "pages/options/options.html",
      open_in_tab: true,
      chrome_style: false,
    },
    background: {
      // page: "./dist/background/index.html",
      scripts: [
        "shared/browser-polyfill.js",
        "background-scripts/extensionListener.js",
        "background-scripts/downloader.js",
        "background-scripts/backgroundScanner.js",
      ],
      persistent: false,
    },
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png",
    },
    permissions: ["<all_urls>", "activeTab", "downloads", "storage"],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["shared/browser-polyfill.js", "content-scripts/index.js"],
      },
    ],
  }

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts
    delete manifest.content_scripts
    manifest.permissions?.push("webNavigation")

    // this is required on dev for Vite script to load
    manifest.content_security_policy = `script-src \'self\' http://localhost:${port}; object-src \'self\'`
  }

  return manifest
}
