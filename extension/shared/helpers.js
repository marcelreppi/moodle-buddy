import { apiUrl, apiKey } from "./env.js"

export function sendEvent(event) {
  browser.storage.local.get(["options", "browserId"]).then(({ options = {}, browserId }) => {
    if (options.disableInteractionTracking) {
      if (!(event === "install" || event === "update")) {
        // Excluding install and update events
        console.log("Tracking disabled!")
        return
      }
    }

    console.log("sendEvent", event)
    return

    if (apiUrl === undefined || apiKey === undefined) {
      return
    }

    const isFirefox = typeof InstallTrigger !== "undefined"
    fetch(apiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        event,
        browser: isFirefox ? "firefox" : "chrome",
        browserId,
      }),
    })
  })
}

export function getActiveTab() {
  return browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
}

export const validURLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/
  .source

export function filterMoodleBuddyKeys(obj) {
  const moodleBuddyKeys = Object.keys(obj).filter(k => k.startsWith("mb_"))
  const newObj = {}
  moodleBuddyKeys.forEach(k => (newObj[k] = obj[k]))
  return newObj
}

export function isFirefox() {
  return typeof InstallTrigger !== "undefined"
}
