export function sendEvent(event) {
  browser.runtime.sendMessage({
    command: "event",
    event,
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
