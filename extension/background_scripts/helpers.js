import { isFirefox, getActiveTab } from "../shared/helpers"

const isDev = process.env.NODE_ENV !== "production"

async function sendToLambda(path, body) {
  if (isDev) {
    console.log({ ...body, dev: isDev })
  }

  if (!process.env.API_URL) return

  fetch(`${process.env.API_URL}${path}`, {
    method: "POST",
    headers: {
      "User-Agent": navigator.userAgent,
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY,
    },
    body: JSON.stringify({ ...body, dev: isDev }),
  })
    // .then(res => console.info(res))
    .catch(error => console.log(error))
}

export async function sendEvent(event, saveURL) {
  const { options, browserId } = await browser.storage.local.get(["options", "browserId"])

  if (options.disableInteractionTracking) {
    if (!(event === "install" || event === "update")) {
      // Excluding install and update events
      console.log("Tracking disabled!")
      return
    }
  }

  let url = ""
  if (saveURL) {
    const activeTab = await getActiveTab()
    // eslint-disable-next-line prefer-destructuring
    url = activeTab.url
  }

  sendToLambda("/event", {
    event,
    browser: isFirefox() ? "firefox" : "chrome",
    browserId,
    url,
  })
}

export async function sendDownloadData(data) {
  const { options } = await browser.storage.local.get("options")

  if (options.disableInteractionTracking) {
    console.log("Tracking disabled!")
    return
  }

  sendToLambda("/download", { fileCount: data.fileCount, byteCount: data.byteCount })
}

export async function sendPageData(HTMLString, page) {
  if (!isDev) {
    sendToLambda("/page", { HTMLString, page })
  } else {
    // console.log(page)
    // console.log(HTMLString)
  }
}

export async function sendFeedback(subject, content) {
  sendToLambda("/feedback", { subject, content })
}

export function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    // eslint-disable-next-line no-bitwise
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  )
}

browser.browserAction.setBadgeBackgroundColor({ color: "#555555" })
browser.browserAction.setBadgeText({ text: "" })

export async function setIcon(tabId) {
  if (tabId) {
    browser.browserAction.setIcon({
      path: {
        16: "/icons/16.png",
        48: "/icons/48.png",
        128: "/icons/128.png",
      },
      tabId,
    })
  }
}

export async function setBadgeText(text, tabId) {
  if (tabId) {
    // If tabId is given reset global and only set the local one
    await browser.browserAction.setBadgeText({ text: "" }) // Reset global badge text
    await browser.browserAction.setBadgeText({ text: `${text}`, tabId }) // Set local badge text
    await browser.storage.local.set({ nUpdates: 0 }) // Reset background update counter
  } else {
    await browser.browserAction.setBadgeText({ text: `${text}` })
  }
}
