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

    browser.browserAction.setIcon({
      path: {
        48: `/icons/icon48${iconTypes[message.iconType]}.png`,
      },
      tabId: sender.tab.id,
    })

    return
  }
})
