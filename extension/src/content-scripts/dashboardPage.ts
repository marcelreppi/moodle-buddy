import shajs from "sha.js"
import {
  DashboardDownloadCourseMessage,
  DashboardScanResultMessage,
  DownloadMessage,
  MarkAsSeenMessage,
  Message,
  ScanInProgressMessage,
  ExtensionStorage,
  DownloadProgressMessage,
  DashboardUpdateCourseMessage,
  DashboardCourseData,
} from "types"
import { checkForMoodle, parseCourseLink } from "@shared/parser"
import { updateIconFromCourses, sendLog, isDebug, getCourseDownloadId } from "@shared/helpers"
import Course from "../models/Course"
import { getURLRegex } from "@shared/regexHelpers"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

let error = false
let scanInProgress = true
let scanTotal = 0
let scanCompleted = 0
let courses: Course[] = []
let lastSettingsHash = ""
let downloadState: Record<string, DownloadProgressMessage> = {}

function getOverviewSettings() {
  const settingsDiv: HTMLElement | null = document.querySelector("[data-region='courses-view']")
  if (settingsDiv) {
    return settingsDiv.dataset
  }

  return null
}

function hasHiddenParent(element: HTMLElement): boolean {
  if (element === null || element.tagName === "HTML") return false
  if (getComputedStyle(element).display === "none" || element.hidden) return true
  return element.parentElement !== null && hasHiddenParent(element.parentElement)
}

function sendScanProgress() {
  chrome.runtime.sendMessage({
    command: COMMANDS.SCAN_IN_PROGRESS,
    completed: scanCompleted,
    total: scanTotal,
  } satisfies ScanInProgressMessage)
}

function courseToDashboardCourseData(course: Course): DashboardCourseData {
  return {
    name: course.name,
    link: course.link,
    isNew: course.isFirstScan,
    resources: course.resources,
    activities: course.activities,
  } satisfies DashboardCourseData
}

function sendScanResults() {
  chrome.runtime.sendMessage({
    command: COMMANDS.SCAN_RESULT,
    courses: courses.map(courseToDashboardCourseData),
  } satisfies DashboardScanResultMessage)
}

async function scanOverview(retry = 0) {
  try {
    const maxRetries = 2
    scanInProgress = true
    scanTotal = 0
    scanCompleted = 0
    courses = []

    const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage
    let courseLinks: string[] = []

    sendScanProgress()

    // Sleep some time to wait for full page load
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Save hash of settings to check for changes
    lastSettingsHash = shajs("sha224").update(JSON.stringify(getOverviewSettings())).digest("hex")

    let useFallback = false

    // Try to use the overview node to find courses
    // If something goes wrong use fallback
    const overviewNode = document.querySelector("[data-region='myoverview']")
    if (overviewNode) {
      const courseNodes = overviewNode.querySelectorAll("[data-region='course-content']")

      if (courseNodes.length !== 0) {
        courseLinks = Array.from(courseNodes).map((n) => parseCourseLink(n.innerHTML))
      } else {
        useFallback = true
      }
    } else {
      useFallback = true
    }

    useFallback = true
    if (useFallback) {
      const searchRoot = document.querySelector("#region-main")
      if (searchRoot) {
        const coursePageRegex = getURLRegex("course")
        courseLinks = Array.from(searchRoot.querySelectorAll("a"))
          .filter((n) => n.href.match(coursePageRegex) && !hasHiddenParent(n))
          .map((n) => n.href)
      }
    }

    if (courseLinks.length === 0) {
      // No courses found
      if (retry < maxRetries) {
        // Retry once more because maybe the page was not fully loaded
        logger.info("No course found in dashboard. Retrying once more...")
        scanOverview(retry + 1)
        return
      }
    } else {
      // Remove duplicates
      courseLinks = Array.from(new Set(courseLinks))
      // Apply maxCoursesOnDashboardPage option
      courseLinks = courseLinks.slice(0, options.maxCoursesOnDashboardPage)

      scanTotal = courseLinks.length

      if (isDebug) {
        logger.debug(courseLinks)
        return
      }

      const domParser = new DOMParser()
      for (const link of courseLinks) {
        try {
          const res = await fetch(link)

          if (link !== res.url) {
            // Skipping unexpected resolved link because sometimes there can be a redirect to other Moodle pages
            continue
          }

          const resBody = await res.text()
          const HTMLDocument = domParser.parseFromString(resBody, "text/html")

          const course = new Course(link, HTMLDocument, options)
          await course.scan()
          courses.push(course)
          scanCompleted++
        } catch (err) {
          scanTotal--
          error = true
          logger.error(err)
          sendLog({ errorMessage: err.message, url: link, page: "dashboard" })
        }
        sendScanProgress()
      }

      chrome.storage.local.set({
        overviewCourseLinks: courses.map((c) => c.link),
      } satisfies Partial<ExtensionStorage>)

      updateIconFromCourses(courses)
    }

    scanInProgress = false
    sendScanResults()
  } catch (err) {
    error = true
    logger.error(err)
    sendLog({ errorMessage: err.message, url: location.href, page: "dashboard" })
  }
}

const isMoodlePage = checkForMoodle()

if (isMoodlePage) {
  scanOverview()
}

function getCourseByLink(link: string): Course {
  const course = courses.find((c) => c.link === link)
  if (!course) {
    throw new Error(`Course with link ${link} is undefined`)
  }
  return course
}

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message
  if (command === COMMANDS.INIT_SCAN) {
    if (error) {
      chrome.runtime.sendMessage({
        command: COMMANDS.ERROR_VIEW,
      } satisfies Message)
      return
    }

    if (scanInProgress) {
      sendScanProgress()
    } else {
      if (error) {
        chrome.runtime.sendMessage({
          command: COMMANDS.ERROR_VIEW,
        } satisfies Message)
        return
      }

      const currentSettingsHash = shajs("sha224")
        .update(JSON.stringify(getOverviewSettings()))
        .digest("hex")

      if (currentSettingsHash !== lastSettingsHash) {
        // User has modified the overview -> Repeat the scan
        lastSettingsHash = currentSettingsHash
        scanOverview()
        return
      }

      if (courses.length === 0) {
        logger.info("empty dashboard")
      }

      sendScanResults()
    }
    return
  }

  if (command === COMMANDS.MARK_AS_SEEN) {
    const { link } = message as MarkAsSeenMessage
    const course = courses.find((c) => c.link === link)

    if (course === undefined) {
      logger.error(`Course with link ${link} is undefined. Failed to process message.`, message)
      return
    }

    // Update course
    await course.updateStoredResources()
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses(courses)
  }

  if (command === COMMANDS.DASHBOARD_DOWNLOAD_NEW) {
    const { link } = message as DashboardDownloadCourseMessage
    const course = getCourseByLink(link)

    const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage

    // Only download new resources
    const downloadNodes = course.resources.filter((r) => r.isNew)

    chrome.runtime.sendMessage({
      command: COMMANDS.DOWNLOAD,
      id: getCourseDownloadId(command, course),
      courseLink: course.link,
      courseName: course.name,
      courseShortcut: course.shortcut,
      resources: downloadNodes,
      options,
    } satisfies DownloadMessage)

    // Update course
    await course.updateStoredResources(downloadNodes)
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses(courses)

    // Send request for an update only after timeout to allow the downloader to send the first progress message
    setTimeout(() => {
      chrome.runtime.sendMessage({
        command: COMMANDS.DASHBOARD_UPDATE_COURSE,
        course: courseToDashboardCourseData(course),
      } satisfies DashboardUpdateCourseMessage)
    }, 500)
  }

  if (command === COMMANDS.ENSURE_CORRECT_BADGE) {
    updateIconFromCourses(courses)
  }

  if (command === COMMANDS.DASHBOARD_DOWNLOAD_COURSE) {
    const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage
    const { link } = message as DashboardDownloadCourseMessage
    const course = getCourseByLink(link)

    const id = getCourseDownloadId(command, course)

    chrome.runtime.sendMessage({
      command: COMMANDS.DOWNLOAD,
      id,
      courseLink: course.link,
      courseName: course.name,
      courseShortcut: course.shortcut,
      resources: course.resources,
      options,
    } satisfies DownloadMessage)

    await course.updateStoredResources(course.resources)
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses(courses)
  }
})
