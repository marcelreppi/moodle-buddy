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

export const startingPageRegex = new RegExp(validURLRegex + /\/my\//.source, "gi")
export const coursePageRegex = new RegExp(
  validURLRegex + /\/course\/view\.php\?id=[0-9]*/.source,
  "i"
)

export function isFirefox() {
  return typeof InstallTrigger !== "undefined"
}
