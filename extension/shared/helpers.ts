import { EventMessage, LogMessage, SetBadgeMessage, LogData } from "types"

import Course from "models/Course"

export function navigateTo(link: string): void {
  browser.tabs.create({
    url: link,
  })
  window.close()
}

export function sendEvent(
  event: string,
  saveURL = true,
  eventData: Record<string, unknown> = {}
): void {
  browser.runtime.sendMessage<EventMessage>({
    command: "event",
    event,
    saveURL,
    eventData,
  })
}

export function sendLog(logData: LogData): void {
  browser.runtime.sendMessage<LogMessage>({
    command: "log",
    logData,
  })
}

export async function getActiveTab(): Promise<browser.tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  return tabs.shift()
}

declare const InstallTrigger: unknown
export const isFirefox = typeof InstallTrigger !== "undefined"

export function getUpdatesFromCourses(courses: Course[]): number {
  const courseList = courses.flat()
  const nUpdates = courseList.reduce((sum, c) => {
    const { nNewFiles, nNewFolders, nNewActivities } = c.counts
    return sum + nNewFiles + nNewFolders + nNewActivities
  }, 0)
  return nUpdates
}

export function updateIconFromCourses(courses: Course[]): void {
  const nUpdates = getUpdatesFromCourses(courses)

  // If there are no further updates reset the icon
  if (nUpdates === 0) {
    browser.runtime.sendMessage<SetBadgeMessage>({
      command: "set-badge",
      text: "",
    })
  } else {
    browser.runtime.sendMessage<SetBadgeMessage>({
      command: "set-badge",
      text: nUpdates.toString(),
    })
  }
}

export const validURLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/gi

type URLRegexType =
  | "login"
  | "dashboard"
  | "course"
  | "courseResources"
  | "videoservice"
  | "file"
  | "folder"
  | "pluginfile"
  | "url"
  | "activity"

const loginPageRegex = /\/login\/index.php/gi
const dashboardPageRegex = /\/my/gi
const coursePageRegex = /\/course\/view\.php\?id=[0-9]*/gi
const courseResourcesPageRegex = /\/course\/resources\.php\?id=[0-9]*/gi
const videoServicePageRegex = /\/mod\/videoservice\/view\.php/gi

const fileRegex = /\/mod\/resource\/view\.php\?id=[0-9]*/gi
const folderRegex = /\/mod\/folder\/view\.php\?id=[0-9]*/gi
const pluginFileRegex = /\/pluginfile\.php([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
const urlRegex = /\/mod\/url\/view\.php\?id=[0-9]*/gi
const activityRegex = /\/mod\/(?!resource|folder)[A-z]*\/view\.php\?id=[0-9]*/gi

const allRegexes: Record<URLRegexType, RegExp> = {
  login: loginPageRegex,
  dashboard: dashboardPageRegex,
  course: coursePageRegex,
  courseResources: courseResourcesPageRegex,
  videoservice: videoServicePageRegex,
  file: fileRegex,
  folder: folderRegex,
  pluginfile: pluginFileRegex,
  url: urlRegex,
  activity: activityRegex,
}
export function getURLRegex(type: URLRegexType): RegExp {
  let regex = validURLRegex.source // Base url
  regex += ".*" // Any other subpath
  regex += allRegexes[type].source // Type-specific url pattern
  return new RegExp(regex, "gi")
}

export function getMoodleBaseURL(string: string): string {
  for (const regex of Object.values(allRegexes)) {
    const baseURLRegex = new RegExp(`.*(?=${regex.source})`)
    const match = string.match(baseURLRegex)
    if (match) {
      return match[0]
    }
  }

  return ""
}
