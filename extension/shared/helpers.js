export function sendEvent(event, saveURL, eventData) {
  browser.runtime.sendMessage({
    command: "event",
    event,
    saveURL,
    eventData,
  })
}

export function sendLog(log) {
  browser.runtime.sendMessage({
    command: "log",
    log,
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

export const loginPageRegex = /\/login\/index.php/gi
export const dashboardPageRegex = /\/my/gi
export const coursePageRegex = /\/course\/view\.php\?id=[0-9]*/gi
export const courseResourcesPageRegex = /\/course\/resources\.php\?id=[0-9]*/gi
export const videoServicePageRegex = /\/mod\/videoservice\/view\.php/gi

export const fileRegex = /\/mod\/resource\/view\.php\?id=[0-9]*/gi
export const folderRegex = /\/mod\/folder\/view\.php\?id=[0-9]*/gi
export const pluginFileRegex = /\/pluginfile\.php([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
export const activityRegex = /\/mod\/(?!resource|folder)[A-z]*\/view\.php\?id=[0-9]*/gi

const allRegexes = {
  login: loginPageRegex,
  dashboard: dashboardPageRegex,
  course: coursePageRegex,
  videoservice: videoServicePageRegex,
  file: fileRegex,
  folder: folderRegex,
  pluginfile: pluginFileRegex,
  activity: activityRegex,
}

export function getURLRegex(type) {
  let regex = validURLRegex.source // Base url
  regex += ".*" // Any other subpath
  regex += allRegexes[type].source // Type-specific url pattern
  return new RegExp(regex, "gi")
}

export function getMoodleBaseURL(string) {
  for (const regex of Object.values(allRegexes)) {
    const baseURLRegex = new RegExp(`.*(?=${regex.source})`)
    const match = string.match(baseURLRegex)
    if (match) {
      return match[0]
    }
  }

  return ""
}
