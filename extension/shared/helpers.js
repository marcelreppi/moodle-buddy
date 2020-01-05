export function sendEvent(event) {
  browser.runtime.sendMessage({
    command: "event",
    event,
  })
}

export function getActiveTab() {
  return browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
}

export function isFirefox() {
  return typeof InstallTrigger !== "undefined"
}

export const validURLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/
  .source

export const startingPageRegex = new RegExp(validURLRegex + /\/my\//.source, "gi")
export const coursePageRegex = new RegExp(
  validURLRegex + /\/course\/view\.php\?id=[0-9]*/.source,
  "i"
)

export const fileRegex = new RegExp(
  validURLRegex + /\/mod\/resource\/view\.php\?id=[0-9]*/.source,
  "gi"
)
export const folderRegex = new RegExp(
  validURLRegex + /\/mod\/folder\/view\.php\?id=[0-9]*/.source,
  "gi"
)
export const pluginFileRegex = new RegExp(
  validURLRegex + /\/pluginfile\.php([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.source,
  "gi"
)
export const activityRegex = new RegExp(
  validURLRegex + /\/mod\/(?!resource|folder)[A-z]*\/view\.php\?id=[0-9]*/.source,
  "gi"
)
