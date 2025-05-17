export const validURLRegex =
  /https?:\/\/((www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b|localhost(:\d+)?)/gi

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
  const baseUrlRegex = validURLRegex.source
  const typeSpecificRegex = allRegexes[type].source
  const regex = `${baseUrlRegex}.*${typeSpecificRegex}`
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
