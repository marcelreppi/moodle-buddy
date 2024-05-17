import {
  CourseData,
  ExtensionStorage,
  StoredCourseData,
  EventMessage,
  ExecuteScriptMessage,
  FeedbackMessage,
  LogMessage,
  Message,
  PageDataMessage,
  SetBadgeMessage,
} from "types"
import defaultExtensionOptions from "../shared/defaultExtensionOptions"
import { isDev } from "../shared/helpers"
import { uuidv4, setIcon, setBadgeText } from "./helpers"
import { sendEvent, sendPageData, sendFeedback, sendLog } from "./tracker"
import logger from "../shared/logger"

const defaultOptions = defaultExtensionOptions

const initialStorage: ExtensionStorage = {
  options: defaultOptions,
  browserId: uuidv4(),
  overviewCourseLinks: [], // Used for background scanning
  nUpdates: 0, // Used for storing updates from background scan
  userHasRated: false,
  totalDownloadedFiles: 0,
  rateHintLevel: 1,
  courseData: {},
  lastBackgroundScanMillis: Date.now(),
}

async function onInstall() {
  await chrome.storage.local.set({
    ...initialStorage,
  } satisfies ExtensionStorage)

  chrome.tabs.create({
    url: "/pages/install/install.html",
  })

  sendEvent("install", false)
}

async function onUpdate() {
  const localStorage = (await chrome.storage.local.get()) as ExtensionStorage
  const localOptions = localStorage.options

  // Merge existing options
  let updatedOptions = { ...defaultOptions }
  if (localOptions) {
    updatedOptions = { ...updatedOptions, ...localOptions }
  }

  // Transfer course data from localStorage to courseData object
  let updatedCourseData: StoredCourseData = {}
  // Add current state
  if (localStorage.courseData) {
    updatedCourseData = { ...localStorage.courseData }
  }
  // Transfer the data
  for (const key in localStorage) {
    if (key.startsWith("http")) {
      updatedCourseData[key] = localStorage[key] as CourseData
      delete localStorage[key]
    }
  }
  // Remove from localStorage
  await chrome.storage.local.remove(Object.keys(updatedCourseData))

  // Merge existing storage data
  await chrome.storage.local.set({
    ...initialStorage,
    ...localStorage,
    courseData: updatedCourseData,
    options: updatedOptions,
  } satisfies ExtensionStorage)

  if (isDev) {
    await chrome.storage.local.set({
      ...initialStorage,
      options: defaultOptions,
      browserId: localStorage.browserId,
    } satisfies ExtensionStorage)
  }

  sendEvent("update", false)

  // chrome.tabs.create({
  //   url: "/pages/update/update.html",
  // })
}

chrome.runtime.onInstalled.addListener(async (details) => {
  switch (details.reason) {
    case "install":
      await onInstall()
      break
    case "update":
      await onUpdate()
      break
    default:
      break
  }

  const { browserId } = await chrome.storage.local.get("browserId")
  chrome.runtime.setUninstallURL(`https://moodlebuddy.com/uninstall?browserId=${browserId}`)
})

chrome.runtime.onMessage.addListener(
  async (message: Message, sender: chrome.runtime.MessageSender) => {
    const { command } = message
    logger.debug({ backgroundCommand: command })

    switch (command) {
      case "event":
        const { event, saveURL, eventData } = message as EventMessage
        sendEvent(event, saveURL, eventData)
        break
      case "page-data":
        const { pageData } = message as PageDataMessage
        sendPageData(pageData)
        break
      case "feedback":
        const { feedbackData } = message as FeedbackMessage
        sendFeedback(feedbackData)
        break
      case "set-icon":
        setIcon(sender.tab?.id)
        break
      case "set-badge":
        const { text, global } = message as SetBadgeMessage
        const tabId = global ? undefined : sender.tab?.id
        setBadgeText(text, tabId)
        break
      case "log":
        const { logData } = message as LogMessage
        sendLog(logData)
        break
      case "clear-course-data":
        await chrome.storage.local.set({
          courseData: {},
        } satisfies Partial<ExtensionStorage>)
        break
      case "reset-storage":
        await chrome.storage.local.set({
          ...initialStorage,
        } satisfies Partial<ExtensionStorage>)
        break
      case "execute-script":
        if (!sender.tab?.id) {
          throw new Error("Error on event execute-script: Sender tab id was empty")
        }
        const { scriptName } = message as ExecuteScriptMessage
        chrome.scripting.executeScript({
          target: {
            tabId: sender.tab?.id,
          },
          files: [`content-scripts/${scriptName}.js`],
        })
        break
      default:
        break
    }
  }
)

chrome.tabs.onHighlighted.addListener(async (tab) => {
  chrome.tabs.sendMessage(tab.tabIds[0], {
    command: "ensure-correct-badge",
  })
})
