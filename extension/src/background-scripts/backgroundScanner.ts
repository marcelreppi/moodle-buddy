import { parseHTML } from "linkedom"
import { ExtensionStorage, Message } from "types"
import { getUpdatesFromCourses } from "../shared/helpers"
import { setBadgeText } from "./helpers"
import Course from "../models/Course"
import { getURLRegex } from "../shared/regexHelpers"
import logger from "../shared/logger"

async function backgroundScan() {
  const { options, overviewCourseLinks } = (await chrome.storage.local.get([
    "options",
    "overviewCourseLinks",
  ])) as ExtensionStorage
  logger.debug("[MoodleBuddy] Background scan start")

  const courses: Course[] = []
  for (const courseLink of overviewCourseLinks) {
    const res = await fetch(courseLink)

    if (res.url.match(getURLRegex("login"))) {
      logger.debug("Moodle Buddy background scan error: Not logged in")
      return
    }

    const resBody = await res.text()
    // TODO: Use offline page for DOMParser API instead
    // https://stackoverflow.com/questions/68964543/chrome-extension-domparser-is-not-defined-with-manifest-v3
    const { document: HTMLDocument } = parseHTML(resBody)
    const course = new Course(courseLink, HTMLDocument, options)
    await course.scan()
    courses.push(course)
  }

  logger.debug("[MoodleBuddy] Background scan end")

  const nUpdates = getUpdatesFromCourses(courses)

  await chrome.storage.local.set({ nUpdates } satisfies Partial<ExtensionStorage>)

  logger.debug(`Found total of ${nUpdates} updates`)

  // If there are no further updates reset the icon
  if (nUpdates === 0) {
    setBadgeText("", (await chrome.tabs.getCurrent())?.id)
    return
  }

  const tabs = await chrome.tabs.query({})
  logger.debug(`Sending notification to ${tabs.length} tabs to update the badge`)
  for (const tab of tabs) {
    if (!tab.id) continue
    chrome.tabs.sendMessage(tab.id, { command: "update-non-moodle-page-badge" } satisfies Message)
  }
}

async function checkTriggerBackgroundScan() {
  logger.debug("Checking if to trigger background scan")
  const { options, lastBackgroundScanMillis } = (await chrome.storage.local.get([
    "options",
    "lastBackgroundScanMillis",
  ])) as ExtensionStorage

  const scanIntervalMillis = 1000 * 60 * options.backgroundScanInterval
  const nowMillis = Date.now()
  const diffBetweenScans = nowMillis - lastBackgroundScanMillis
  const shouldTriggerScan = options.enableBackgroundScanning && diffBetweenScans > scanIntervalMillis

  logger.debug(`Scan conditions: enabled=${options.enableBackgroundScanning},  diffBetweenScans=${diffBetweenScans}ms`)
  if (!shouldTriggerScan) {
    logger.debug("Did not trigger background scan")
    return
  }

  await backgroundScan()
  await chrome.storage.local.set({
    lastBackgroundScanMillis: nowMillis,
  } as ExtensionStorage)
  logger.debug(`Updated background scan timestamp to ${nowMillis}`)
}

chrome.runtime.onMessage.addListener(
  async (message: Message, sender: chrome.runtime.MessageSender) => {
    const { command } = message
    switch (command) {
      case "check-background-scan":
        checkTriggerBackgroundScan()
        break
      case "background-scan":
        backgroundScan()
        break
      default:
        break
    }
  }
)
