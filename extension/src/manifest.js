const pkg = require("../package.json")

const EXTENSION_ID = "moodlebuddy@marcelreppi"
const BACKGROUND_SCRIPT = "background.js"

const action = {
  default_icon: {
    16: "icons/16-gray.png",
    32: "icons/32-gray.png",
    48: "icons/48-gray.png",
    128: "icons/128-gray.png",
  },
  default_title: pkg.displayName,
  default_popup: "popup/index.html",
}

const firefoxProperties = {
  manifest_version: 2,
  browser_specific_settings: {
    gecko: {
      id: EXTENSION_ID,
    },
  },
  browser_action: action,
  background: {
    scripts: [BACKGROUND_SCRIPT],
  },
  permissions: ["<all_urls>", "activeTab", "downloads", "storage", "scripting"],
}

const chromeProperties = {
  manifest_version: 3,
  action,
  background: {
    service_worker: BACKGROUND_SCRIPT,
  },
  host_permissions: ["<all_urls>"],
  permissions: ["activeTab", "downloads", "storage", "scripting"],
}

function getBrowserSpecificProperties() {
  switch (process.env.TARGET) {
    case "firefox":
      return firefoxProperties
    case "chrome":
      return chromeProperties
    default:
      throw new Error(`Unknown target: ${process.env.TARGET}`)
  }
}

function getManifest() {
  return {
    // id: EXTENSION_ID, // TODO: Validate if I need this
    name: pkg.displayName,
    version: pkg.version,
    description: pkg.description,
    icons: {
      16: "icons/16.png",
      32: "icons/32.png",
      48: "icons/48.png",
      128: "icons/128.png",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content-scripts/index.js"],
      },
    ],
    options_ui: {
      page: "pages/options/options.html",
      open_in_tab: true,
    },
    ...getBrowserSpecificProperties(),
  }
}

module.exports = getManifest
