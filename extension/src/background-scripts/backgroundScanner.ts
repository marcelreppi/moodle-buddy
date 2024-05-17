import {
  BackgroundCourseScanMessage,
  BackgroundCourseScanResultMessage,
  ExtensionStorage,
  Message,
} from "types"
import logger from "../shared/logger"
import { getURLRegex } from "../shared/regexHelpers"
import { setBadgeText } from "./helpers"

const SLEEP_DURATION = 1000
const MAX_RETRIES = 100

let courseUpdates: Record<string, number> = {}

async function backgroundScan() {
  logger.debug("[MoodleBuddy] Background scan start")
  courseUpdates = {}
  const { overviewCourseLinks } = (await chrome.storage.local.get(
    "overviewCourseLinks"
  )) as ExtensionStorage

  for (const courseLink of overviewCourseLinks) {
    // Init with -1 and update later when course was scanned on content script
    courseUpdates[courseLink] = -1

    const res = await fetch(courseLink)

    if (res.url.match(getURLRegex("login"))) {
      logger.debug("Moodle Buddy background scan error: Not logged in")
      return
    }

    const resBody = await res.text()

    const [activeTab] = await chrome.tabs.query({ active: true })
    if (activeTab?.id) {
      logger.debug(`Sending course html to content script for course ${courseLink}`)
      chrome.tabs.sendMessage(activeTab.id, {
        command: "bg-course-scan",
        href: courseLink,
        html: resBody,
      } satisfies BackgroundCourseScanMessage)
    }
  }

  logger.debug(`Wait for scan results to come in`)
  let tryNumber = 0
  let allCoursesHaveBeenUpdated = false
  while (!allCoursesHaveBeenUpdated) {
    if (tryNumber === MAX_RETRIES) {
      const missingCourses = Object.keys(courseUpdates).filter((link) => courseUpdates[link] < 0)
      missingCourses.forEach((link) => delete courseUpdates[link])
      logger.debug(
        { missingCourses, remainingCourseUpdates: courseUpdates },
        `Did not receive course updates for ${missingCourses.length} in time. Ignoring them and process the remaining ${overviewCourseLinks.length - missingCourses.length} courses.`
      )
      break
    }

    allCoursesHaveBeenUpdated = Object.values(courseUpdates).every((x) => x >= 0)
    await new Promise((res) => setTimeout(res, SLEEP_DURATION))
    tryNumber++
  }

  logger.debug("[MoodleBuddy] Background scan end")

  const nUpdates = Object.values(courseUpdates).reduce((sum, current) => sum + current, 0)

  await chrome.storage.local.set({ nUpdates } satisfies Partial<ExtensionStorage>)

  logger.debug(`Found total of ${nUpdates} updates`)

  const text = nUpdates === 0 ? "" : nUpdates.toString()
  setBadgeText(text)
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
  const shouldTriggerScan =
    options.enableBackgroundScanning && diffBetweenScans > scanIntervalMillis

  logger.debug(
    {
      enabled: options.enableBackgroundScanning,
      scanIntervalMillis,
      diffBetweenScansMillis: diffBetweenScans,
    },
    `Scan conditions`
  )
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
      case "bg-course-scan-result":
        logger.debug(message.command)
        const { href, nUpdates } = message as BackgroundCourseScanResultMessage
        courseUpdates[href] = nUpdates
        break
      default:
        break
    }
  }
)
