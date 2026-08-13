import {
  ExecuteScriptMessage,
  ExtensionStorage,
  Message,
  ScriptName,
  SetBadgeMessage,
  SupportedPage,
} from "types"
import { isDev } from "@shared/helpers"
import { checkForMoodle } from "@shared/parser"
import { getMoodleBaseURL, getURLRegex } from "@shared/regexHelpers"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

const paginatedCourseFormats = new Set([
  "format-flexsections",
  "format-mst",
  "format-multitopic",
  "format-onetopic",
])

const pageToScriptMapping: Record<NonNullable<SupportedPage>, ScriptName> = {
  course: "coursePage",
  courseSection: "courseSectionPage",
  activity: "activityPage",
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
  } satisfies Partial<ExtensionStorage>)
}

export function getSupportedPage(
  href = location.href,
  HTMLDocument = document
): SupportedPage | undefined {
  const dashboardPageRegex = getURLRegex("dashboard")
  const isDashboardPage = Boolean(href.match(dashboardPageRegex))
  if (isDashboardPage) return "dashboard"

  const coursePageRegex = getURLRegex("course")
  const courseResourcesPageRegex = getURLRegex("courseResources")
  const isCoursePage = Boolean(href.match(coursePageRegex) || href.match(courseResourcesPageRegex))
  if (isCoursePage) {
    const url = new URL(href)
    const isCourseSection =
      url.pathname.endsWith("/course/section.php") ||
      url.searchParams.has("section") ||
      url.searchParams.has("sectionid") ||
      Array.from(HTMLDocument.body?.classList ?? []).some((className) =>
        paginatedCourseFormats.has(className)
      )

    return isCourseSection ? "courseSection" : "course"
  }

  const activityPageRegex = getURLRegex("activity")
  const isActivityPage = Boolean(href.match(activityPageRegex))
  if (isActivityPage) return "activity"

  const videoServicePageRegex = getURLRegex("videoservice")
  const isVideoServicePage = Boolean(href.match(videoServicePageRegex))
  if (isVideoServicePage) return "videoservice"

  if (isDev) {
    const filename = href.split("/").pop()?.toLowerCase()
    if (filename?.includes("section")) return "courseSection"
    if (filename?.includes("course")) return "course"
    if (filename?.includes("dashboard")) return "dashboard"
    if (filename?.includes("activity")) return "activity"
    if (filename?.includes("videoservice")) return "videoservice"
  }

  return undefined
}

async function initIconAndBadge(page: SupportedPage | undefined) {
  if (page === undefined) {
    const { nUpdates } = (await chrome.storage.local.get("nUpdates")) as ExtensionStorage
    const text = nUpdates === 0 ? "" : nUpdates.toString()
    chrome.runtime.sendMessage({
      command: COMMANDS.SET_BADGE,
      text,
      global: true,
    } satisfies SetBadgeMessage)
  } else {
    chrome.runtime.sendMessage({
      command: COMMANDS.SET_ICON,
    } satisfies Message)

    chrome.runtime.sendMessage({
      command: COMMANDS.SET_BADGE,
      text: "",
      global: true,
    } satisfies SetBadgeMessage)
  }
}

export function detectPage(): SupportedPage | undefined {
  let page: SupportedPage | undefined

  const isMoodlePage = checkForMoodle()

  if (isMoodlePage) {
    setDefaultMoodleURL()
    page = getSupportedPage()
    logger.debug({ supportedPage: page })
  }

  initIconAndBadge(page)

  if (page !== undefined) {
    chrome.runtime.sendMessage({
      command: COMMANDS.EXECUTE_SCRIPT,
      scriptName: pageToScriptMapping[page],
    } satisfies ExecuteScriptMessage)
  }

  return page
}
