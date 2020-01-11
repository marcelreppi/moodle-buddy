import { isFirefox } from "../shared/helpers"

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

  if (!process.env.API_URL) {
    return
  }

  const isDev = process.env.NODE_ENV === "development"

  if (isDev) {
    console.log({
      event,
      browser: isFirefox() ? "firefox" : "chrome",
      browserId,
      dev: isDev,
    })
  }

  fetch(`${process.env.API_URL}/event`, {
    method: "POST",
    headers: {
      "User-Agent": navigator.userAgent,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event,
      browser: isFirefox() ? "firefox" : "chrome",
      browserId,
      dev: isDev,
    }),
  })
    // .then(res => console.info(res))
    .catch(error => console.log(error))
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

browser.runtime.onInstalled.addListener(async details => {
  const { browserId } = await browser.storage.local.get("browserId")
  switch (details.reason) {
    case "install":
      await browser.storage.local.set({
        browserId: uuidv4(),
        options: defaultOptions,
      })
      sendEvent("install")
      break
    case "update":
      if (process.env.NODE_ENV === "development") {
        await browser.storage.local.set({
          options: defaultOptions,
        })
      }
      if (browserId === undefined) {
        await browser.storage.local.set({
          browserId: uuidv4(),
        })
      }
      sendEvent("update")
      break
    default:
      break
  }
})

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.command === "event") {
    sendEvent(message.event)
    return
  }

  if (message.command === "set-icon") {
    const iconTypes = {
      gray: "-gray",
      normal: "",
      new: "-blue",
    }

    const currentBadgeText = ""
    browser.browserAction.setBadgeText({
      text: `${
        currentBadgeText === "" ? message.text : parseFloat(currentBadgeText) + message.text
      }`,
      tabId: sender.tab.id,
    })
    browser.browserAction.setBadgeBackgroundColor({
      color: "#555555",
      tabId: sender.tab.id,
    })

    if (message.iconType === "new") return

    browser.browserAction.setIcon({
      path: {
        48: `/icons/icon48${iconTypes[message.iconType]}.png`,
      },
      tabId: sender.tab.id,
    })

    return
  }
})
