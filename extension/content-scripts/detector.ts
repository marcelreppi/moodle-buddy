import {
  ExtensionStorage,
  SupportedPage,
  ExecuteScriptMessage,
  Message,
  PageDataMessage,
  StateMessage,
  PageData,
  ScriptName,
} from "types"

import { getMoodleBaseURL, getURLRegex, sendEvent } from "../shared/helpers"
import { checkForMoodle } from "../shared/parser"

const pageToScriptMapping: Record<NonNullable<SupportedPage>, ScriptName> = {
  course: "coursePage",
  dashboard: "dashboardPage",
  videoservice: "videoservicePage",
}

async function setDefaultMoodleURL() {
  const { options }: ExtensionStorage = await browser.storage.local.get("options")

  if (!options.autoSetMoodleURL) return

  const baseURL = getMoodleBaseURL(location.href)
  await browser.storage.local.set({
    options: {
      ...options,
      defaultMoodleURL: `${baseURL}/my`,
    },
  })
}

function getSupportedPage(): SupportedPage | undefined {
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

  if (process.env.NODE_ENV === "debug") {
    const filename = location.href.split("/").pop()
    if (filename?.includes("course")) return "course"
    if (filename?.includes("dashboard")) return "dashboard"
    if (filename?.includes("videoservice")) return "videoservice"
  }

  return undefined
}

async function runDetector() {
  let page: SupportedPage

  const isMoodlePage = checkForMoodle()

  if (isMoodlePage) {
    page = getSupportedPage()
  }

  if (page !== undefined) {
    browser.runtime.sendMessage<Message>({
      command: "set-icon",
    })

    setDefaultMoodleURL()

    browser.runtime.sendMessage<ExecuteScriptMessage>({
      command: "execute-script",
      scriptName: pageToScriptMapping[page],
    })
  }

  async function updateVueState() {
    const localStorage: ExtensionStorage = await browser.storage.local.get()
    const { options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel } = localStorage
    browser.runtime.sendMessage<StateMessage>({
      command: "state",
      state: { page, options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel },
    })
  }

  const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
    const { command } = message as Message

    if (command === "get-state") {
      updateVueState()
    }

    if (command === "track-page-view") {
      if (page === undefined) return

      sendEvent(`view-${page}-page`, true)

      const pageData: PageData = {
        page,
        content: document.querySelector("html")?.outerHTML || "",
      }
      browser.runtime.sendMessage<PageDataMessage>({
        command: "page-data",
        pageData,
      })
    }

    if (command === "rate-click") {
      await browser.storage.local.set({
        userHasRated: true,
      })
      updateVueState()
    }

    if (command === "avoid-rate-click") {
      const { rateHintLevel }: ExtensionStorage = await browser.storage.local.get()
      await browser.storage.local.set({
        rateHintLevel: rateHintLevel + 1,
      })
      updateVueState()
    }
  }
  browser.runtime.onMessage.addListener(messageListener)
}

runDetector()
