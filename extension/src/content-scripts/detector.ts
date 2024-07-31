import {
  ExecuteScriptMessage,
  ExtensionStorage,
  Message,
  ScriptName,
  SetBadgeMessage,
  SupportedPage,
} from "types"
import { isDebug } from "@shared/helpers"
import { checkForMoodle } from "@shared/parser"
import { getMoodleBaseURL, getURLRegex } from "@shared/regexHelpers"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

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
  } satisfies Partial<ExtensionStorage>)
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
