import browser from "webextension-polyfill"
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
}

async function onInstall() {
  await browser.storage.local.set({
    ...initialStorage,
  } satisfies ExtensionStorage)

  browser.tabs.create({
    url: "/pages/install/install.html",
  })

  sendEvent("install", false)
}

async function onUpdate() {
  const localStorage = (await browser.storage.local.get()) as ExtensionStorage
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
  await browser.storage.local.remove(Object.keys(updatedCourseData))

  // Merge existing storage data
  await browser.storage.local.set({
    ...initialStorage,
    ...localStorage,
    courseData: updatedCourseData,
    options: updatedOptions,
  } satisfies ExtensionStorage)

  if (isDev) {
    await browser.storage.local.set({
      ...initialStorage,
      options: defaultOptions,
      browserId: localStorage.browserId,
    } satisfies ExtensionStorage)
  }

  sendEvent("update", false)

  // browser.tabs.create({
  //   url: "/pages/update/update.html",
  // })
}

browser.runtime.onInstalled.addListener(async (details) => {
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
  browser.runtime.setUninstallURL(`https://moodlebuddy.com/uninstall?browserId=${browserId}`)
})

browser.runtime.onMessage.addListener(
  async (message: Message, sender: browser.Runtime.MessageSender) => {
    const { command } = message
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
        } satisfies Partial<ExtensionStorage>)
        break
      case "execute-script":
        if (!sender.tab?.id) {
          throw new Error("Error on event execute-script: Sender tab id was empty")
        }
        const { scriptName } = message as ExecuteScriptMessage
        browser.scripting.executeScript({
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

browser.tabs.onCreated.addListener(async (tab) => {
  const { nUpdates } = (await browser.storage.local.get("nUpdates")) as ExtensionStorage
  if (nUpdates > 0) {
    setBadgeText(nUpdates.toString(), tab.id)
  }
})

browser.tabs.onActivated.addListener((tab) => {
  browser.tabs.sendMessage(tab.tabId, { command: "update-non-moodle-page-badge" } satisfies Message)
})