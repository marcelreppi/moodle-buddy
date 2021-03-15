import { CourseData } from "extension/models/Course.types"
import { uuidv4, setIcon, setBadgeText } from "./helpers"
import { sendEvent, sendPageData, sendFeedback, sendLog } from "./tracker"
import { ExtensionOptions, ExtensionStorage, StoredCourseData } from "../types/extension.types"
import {
  EventMessage,
  ExecuteScriptMessage,
  FeedbackMessage,
  LogMessage,
  Message,
  PageDataMessage,
  SetBadgeMessage,
} from "../types/messages.types"

const defaultOptions: ExtensionOptions = {
  onlyNewResources: false,
  useMoodleFileName: true,
  showDownloadOptions: false,
  prependCourseShortcutToFileName: false,
  prependCourseToFileName: false,
  alwaysShowDetails: false,
  disableInteractionTracking: false,
  defaultMoodleURL: "",
  autoSetMoodleURL: true,
  backgroundScanInterval: 30,
  enableBackgroundScanning: true,
  downloadFolderAsZip: true,
  saveToMoodleFolder: false,
  folderStructure: "CourseFile",
  includeVideo: true,
  includeAudio: true,
  includeImage: false,
  maxConcurrentDownloads: 100,
  maxCoursesOnDashboardPage: 100,
}

const initialStorage: ExtensionStorage = {
  options: defaultOptions,
  browserId: uuidv4(),
  overviewCourseLinks: [], // Used for background scanning
  nUpdates: 0, // Used for storing updates from background scan
  userHasRated: false,
  totalDownloadedFiles: 0,
  rateHintLevel: 1,
  courseData: {},
}

async function onInstall() {
  await browser.storage.local.set({
    ...initialStorage,
  })

  browser.tabs.create({
    url: "/pages/install/install.html",
  })

  sendEvent("install", false)
}

async function onUpdate() {
  const localStorage: ExtensionStorage = await browser.storage.local.get()
  const localOptions: ExtensionOptions = localStorage.options as ExtensionOptions

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
  await browser.storage.local.remove(Object.keys(updatedCourseData))

  // Merge existing storage data
  await browser.storage.local.set({
    ...initialStorage,
    ...localStorage,
    courseData: updatedCourseData,
    options: updatedOptions,
  })

  if (process.env.NODE_ENV === "development") {
    await browser.storage.local.set({
      ...initialStorage,
      options: defaultOptions,
      browserId: localStorage.browserId,
    })
  }

  sendEvent("update", false)

  // browser.tabs.create({
  //   url: "/pages/update/update.html",
  // })
}

browser.runtime.onInstalled.addListener(async details => {
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

  const { browserId } = await browser.storage.local.get("browserId")
  browser.runtime.setUninstallURL(
    `https://moodlebuddy.com/uninstall/uninstall.html?browserId=${browserId}`
  )
})

const messageListener: browser.runtime.onMessageEvent = async (
  // eslint-disable-next-line @typescript-eslint/ban-types
  message: object,
  sender: browser.runtime.MessageSender
) => {
  const { command } = message as Message
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
      const { text } = message as SetBadgeMessage
      setBadgeText(text, sender.tab?.id)
      break
    case "log":
      const { logData } = message as LogMessage
      sendLog(logData)
      break
    case "clear-course-data":
      await browser.storage.local.set({
        courseData: initialStorage.courseData,
      })
      break
    case "execute-script":
      const { scriptName } = message as ExecuteScriptMessage
      browser.tabs.executeScript(undefined, {
        file: `content-scripts/${scriptName}Page.js`,
      })
      break
    default:
      break
  }
}
browser.runtime.onMessage.addListener(messageListener)
