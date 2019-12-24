import { apiUrl, apiKey } from "./env.js"

export function sendEvent(event) {
  console.log("sendEvent " + event)
  return

  if (apiUrl === undefined || apiKey === undefined) {
    return
  }

  const now = new Date()
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
    }),
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
