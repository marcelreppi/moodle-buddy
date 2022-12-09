import { ExecuteScriptMessage, ExtensionStorage, Message, ScriptName, SupportedPage } from "types"
import { isDebug } from "../shared/helpers"
import { checkForMoodle } from "../shared/parser"
import { getMoodleBaseURL, getURLRegex } from "../shared/regexHelpers"

const pageToScriptMapping: Record<NonNullable<SupportedPage>, ScriptName> = {
  course: "coursePage",
  dashboard: "dashboardPage",
  videoservice: "videoservicePage",
}

async function setDefaultMoodleURL() {
  const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage

  if (!options.autoSetMoodleURL) return

  const baseURL = getMoodleBaseURL(location.href)
  await chrome.storage.local.set({
    options: {
      ...options,
      defaultMoodleURL: `${baseURL}/my`,
    },
  } as ExtensionStorage)
}

export function getSupportedPage(): SupportedPage | undefined {
  const dashboardPageRegex = getURLRegex("dashboard")
  const isDashboardPage = Boolean(location.href.match(dashboardPageRegex))
  if (isDashboardPage) return "dashboard"

  const coursePageRegex = getURLRegex("course")
  const courseResourcesPageRegex = getURLRegex("courseResources")
  const isCoursePage = Boolean(
    location.href.match(coursePageRegex) || location.href.match(courseResourcesPageRegex)
  )
  if (isCoursePage) return "course"

  const videoServicePageRegex = getURLRegex("videoservice")
  const isVideoServicePage = Boolean(location.href.match(videoServicePageRegex))
  if (isVideoServicePage) return "videoservice"

  if (isDebug) {
    const filename = location.href.split("/").pop()
    if (filename?.includes("course")) return "course"
    if (filename?.includes("dashboard")) return "dashboard"
    if (filename?.includes("videoservice")) return "videoservice"
  }

  return undefined
}

export function detectPage(): SupportedPage | undefined {
  let page: SupportedPage | undefined

  const isMoodlePage = checkForMoodle()

  if (isMoodlePage) {
    page = getSupportedPage()
  }

  if (page !== undefined) {
    chrome.runtime.sendMessage<Message>({
      command: "set-icon",
    })

    setDefaultMoodleURL()

    chrome.runtime.sendMessage<ExecuteScriptMessage>({
      command: "execute-script",
      scriptName: pageToScriptMapping[page],
    })
  }

  return page
}
