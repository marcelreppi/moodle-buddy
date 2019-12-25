import { apiUrl, apiKey } from "./env.js"

export function sendEvent(event) {
  browser.storage.local.get(["options", "browserId"]).then(localStorage => {
    const { options, browserId } = localStorage

    if (options && options.disableInteractionTracking) {
      if (!(event === "install" || event === "update")) {
        // Excluding install and update events
        console.log("Tracking disabled!")
        return
      }
    }

    if (apiUrl === undefined || apiKey === undefined) {
      return
    }

    // console.log("sendEvent", {
    //   event,
    //   browser: isFirefox() ? "firefox" : "chrome",
    //   browserId,
    // })
    // return

    fetch(apiUrl, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        event,
        browser: isFirefox() ? "firefox" : "chrome",
        browserId,
        // test: true,
      }),
    })
      // .then(res => console.log(res.status))
      .catch(error => console.log(error))
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
