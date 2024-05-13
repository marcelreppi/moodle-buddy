import { parseHTML } from "linkedom"
import { ExtensionStorage, Message } from "types"
import { getUpdatesFromCourses } from "../shared/helpers"
import { setBadgeText } from "./helpers"
import Course from "../models/Course"
import { getURLRegex } from "../shared/regexHelpers"
import logger from "../shared/logger"

// chrome.storage.local.clear()

async function backgroundScan() {
  const { options, overviewCourseLinks } = (await chrome.storage.local.get([
    "options",
    "overviewCourseLinks",
  ])) as ExtensionStorage

  if (!options.enableBackgroundScanning) {
    logger.info("[MoodleBuddy] Background scanning disabled")
    return
  }

  logger.info("[MoodleBuddy] Background scan start")
  const courses: Course[] = []
  for (const courseLink of overviewCourseLinks) {
    const res = await fetch(courseLink)

    if (res.url.match(getURLRegex("login"))) {
      logger.info("Moodle Buddy background scan error: Not logged in")
      return
    }

    const resBody = await res.text()
    const { document: HTMLDocument } = parseHTML(resBody)
    const course = new Course(courseLink, HTMLDocument, options)
    await course.scan()
    courses.push(course)
  }
  logger.info("[MoodleBuddy] Background scan end")

  const nUpdates = getUpdatesFromCourses(courses)

  await chrome.storage.local.set({ nUpdates } satisfies Partial<ExtensionStorage>)

  logger.info({ nUpdates })

  // If there are no further updates reset the icon
  if (nUpdates === 0) {
    setBadgeText("", (await chrome.tabs.getCurrent())?.id)
    return
  }

  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (!tab.id) continue
    chrome.tabs.sendMessage(tab.id, { command: "update-non-moodle-page-badge" } satisfies Message)
  }
}

async function startBackgroundScanning() {
  const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage

  if (!options) {
    setTimeout(() => {
      startBackgroundScanning()
    }, 1000)
  } else {
    setInterval(() => {
      backgroundScan()
    }, 15000)

    setInterval(backgroundScan, 1000 * 60 * options.backgroundScanInterval)
  }
}

startBackgroundScanning()
