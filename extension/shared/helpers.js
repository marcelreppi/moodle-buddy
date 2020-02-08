export function sendEvent(event, saveURL) {
  browser.runtime.sendMessage({
    command: "event",
    event,
    saveURL,
  })
}

export function getActiveTab() {
  return browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
}

export function isFirefox() {
  return typeof InstallTrigger !== "undefined"
}

export function getUpdatesFromCourses(...courses) {
  const courseList = courses.flat()
  const nUpdates = courseList.reduce((sum, c) => {
    const { nNewFiles, nNewFolders } = c.resourceCounts
    const { nNewActivities } = c.activityCounts
    return sum + nNewFiles + nNewFolders + nNewActivities
  }, 0)
  return nUpdates
}

export function updateIconFromCourses(courses) {
  const nUpdates = getUpdatesFromCourses(courses)

  // If there are no further updates reset the icon
  if (nUpdates === 0) {
    browser.runtime.sendMessage({
      command: "set-badge",
      text: "",
    })
  } else {
    browser.runtime.sendMessage({
      command: "set-badge",
      text: nUpdates,
    })
  }
}

export const validURLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/gi

export const loginURLRegex = new RegExp(validURLRegex.source + /\/login\/index.php/.source, "gi")
export const dashboardPageRegex = new RegExp(validURLRegex.source + /\/my/.source, "gi")
export const coursePageRegex = new RegExp(
  validURLRegex.source + /\/course\/view\.php\?id=[0-9]*/.source,
  "i"
)

export const fileRegex = new RegExp(
  validURLRegex.source + /\/mod\/resource\/view\.php\?id=[0-9]*/.source,
  "gi"
)
export const folderRegex = new RegExp(
  validURLRegex.source + /\/mod\/folder\/view\.php\?id=[0-9]*/.source,
  "gi"
)
export const pluginFileRegex = new RegExp(
  validURLRegex.source + /\/pluginfile\.php([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.source,
  "gi"
)
export const activityRegex = new RegExp(
  validURLRegex.source + /\/mod\/(?!resource|folder)[A-z]*\/view\.php\?id=[0-9]*/.source,
  "gi"
)
