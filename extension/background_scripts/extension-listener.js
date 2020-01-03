import { isFirefox, getActiveTab, startingPageRegex, coursePageRegex } from "../shared/helpers"

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    // eslint-disable-next-line no-bitwise
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  )
}

async function sendEvent(event) {
  const { options, browserId } = await browser.storage.local.get(["options", "browserId"])

  if (options.disableInteractionTracking) {
    if (!(event === "install" || event === "update")) {
      // Excluding install and update events
      console.log("Tracking disabled!")
      return
    }
  }

  if (!process.env.API_URL || !process.env.API_KEY) {
    return
  }

  if (process.env.NODE_ENV === "development") {
    console.log({
      event,
      browser: isFirefox() ? "firefox" : "chrome",
      browserId,
    })
  }

  fetch(process.env.API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": process.env.API_KEY,
    },
    body: JSON.stringify({
      event,
      browser: isFirefox() ? "firefox" : "chrome",
      browserId,
      dev: process.env.NODE_ENV === "development",
    }),
  })
    // .then(res => console.info(res))
    .catch(error => console.log(error))
}

async function onTabInteraction(skipScan) {
  // console.log("check tab")

  const activeTab = await getActiveTab()
  const coursePageMatch = activeTab.url.match(coursePageRegex)
  const startPageMatch = activeTab.url.match(startingPageRegex)
  if (coursePageMatch) {
    // Set to normal active icon
    browser.browserAction.setIcon({
      path: {
        16: "/icons/icon16.png",
        48: "/icons/icon48.png",
      },
    })
    if (skipScan) return
    // Icon will be updated if updates are there
    browser.tabs.sendMessage(activeTab.id, {
      command: "scan",
    })
  } else if (startPageMatch) {
    // Set normal icon as default
    browser.browserAction.setIcon({
      path: {
        16: "/icons/icon16.png",
        48: "/icons/icon48.png",
      },
    })
    if (skipScan) return
    // Icon will be updated if updates are there
    browser.tabs.sendMessage(activeTab.id, {
      command: "scan",
    })
  } else {
    // Set to unavailable icon
    browser.browserAction.setIcon({
      path: {
        16: "/icons/icon16-gray.png",
        48: "/icons/icon48-gray.png",
      },
    })
  }
}

const defaultOptions = {
  onlyNewResources: false,
  saveToFolder: true,
  useMoodleFileName: true,
  showDownloadOptions: true,
  prependCourseShortcutToFileName: false,
  prependCourseToFileName: false,
  alwaysShowDetails: false,
  disableInteractionTracking: false,
}

browser.runtime.onInstalled.addListener(details => {
  switch (details.reason) {
    case "install":
      browser.storage.local
        .set({
          browserId: uuidv4(),
          options: defaultOptions,
        })
        .then(() => {
          sendEvent("install")
        })

      break
    case "update":
      if (process.env.NODE_ENV === "development") {
        browser.storage.local.set({
          options: defaultOptions,
        })
      }
      onTabInteraction()
      sendEvent("update")
      break
    default:
      break
  }
})

browser.tabs.onActivated.addListener(() => onTabInteraction())
browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  const { status, url } = changeInfo
  if (status && status === "loading" && url) {
    // Skip scan because this update is a navigation anyways
    onTabInteraction(true)
  }
})

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "event") {
    sendEvent(message.event)
  }

  if (message.command === "set-icon-new") {
    browser.browserAction.setIcon({
      path: {
        48: "/icons/icon48-blue.png",
      },
    })
  }

  if (message.command === "set-icon-normal") {
    browser.browserAction.setIcon({
      path: {
        48: "/icons/icon48.png",
      },
    })
  }
})
