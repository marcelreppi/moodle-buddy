import { isFirefox, getActiveTab, validURLRegex } from "../shared/helpers"

export async function sendEvent(event) {
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

  let url = ""
  const activeTab = await getActiveTab()
  if (event.startsWith("view") || event.startsWith("download")) {
    // eslint-disable-next-line prefer-destructuring
    url = activeTab.url.match(validURLRegex)[0]
  }

  const body = {
    event,
    browser: isFirefox() ? "firefox" : "chrome",
    browserId,
    url,
    dev: isDev,
  }

  if (isDev) {
    console.log(body)
  }

  fetch(`${process.env.API_URL}/event`, {
    method: "POST",
    headers: {
      "User-Agent": navigator.userAgent,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    // .then(res => console.info(res))
    .catch(error => console.log(error))
}

export function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    // eslint-disable-next-line no-bitwise
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  )
}

browser.browserAction.setBadgeBackgroundColor({ color: "#555555" })
browser.browserAction.setBadgeText({ text: "" })

export async function setIcon(type, text, tabId) {
  const iconTypes = {
    normal: "",
    update: "",
  }

  if (tabId) {
    browser.browserAction.setIcon({
      path: {
        48: `/icons/icon48${iconTypes[type]}.png`,
      },
      tabId,
    })
  }

  // Detector is the only one who sends no text
  // Make no changes no existings badge texts
  if (text === undefined) return

  if (text === "") {
    await browser.browserAction.setBadgeText({ text: "" }) // Reset global badge text
    await browser.browserAction.setBadgeText({ text: "", tabId }) // Revert tabs badge text to global badge text
    return
  }

  if (tabId) {
    // If tabId is given reset global and only set the local one
    await browser.browserAction.setBadgeText({ text: "" }) // Reset global badge text
    await browser.browserAction.setBadgeText({ text: `${text}`, tabId })
  } else {
    await browser.browserAction.setBadgeText({ text: `${text}` })
  }
}
