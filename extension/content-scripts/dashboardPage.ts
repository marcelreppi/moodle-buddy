import shajs from "sha.js"

import {
  DashboardCrawlMessage,
  DashboardScanResultMessage,
  DownloadMessage,
  ErrorViewMessage,
  MarkAsSeenMessage,
  Message,
  ScanInProgressMessage,
} from "extension/types/messages.types"
import { ExtensionStorage } from "extension/types/extension.types"
import { checkForMoodle, parseCourseLink } from "../shared/parser"
import { getURLRegex, updateIconFromCourses, sendLog } from "../shared/helpers"
import Course from "../models/Course"

let error = false
let scanInProgress = true
let scanTotal = 0
let scanCompleted = 0
let courses: Course[] = []
let lastSettingsHash = ""

function getOverviewSettings() {
  const settingsDiv: HTMLElement | null = document.querySelector("[data-region='courses-view'")
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
  browser.runtime.sendMessage<ScanInProgressMessage>({
    command: "scan-in-progress",
    completed: scanCompleted,
    total: scanTotal,
  })
}

function sendScanResults() {
  browser.runtime.sendMessage<DashboardScanResultMessage>({
    command: "scan-result",
    courses: courses.map(c => ({
      name: c.name,
      link: c.link,
      isNew: c.isFirstScan,
      resources: c.resources,
      activities: c.activities,
      counts: c.counts,
    })),
  })
}

async function scanOverview(retry = 0) {
  try {
    const maxRetries = 2
    scanInProgress = true
    scanTotal = 0
    scanCompleted = 0
    courses = []

    const { options }: ExtensionStorage = await browser.storage.local.get("options")
    let courseLinks: string[] = []

    sendScanProgress()

    // Sleep some time to wait for full page load
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Save hash of settings to check for changes
    lastSettingsHash = shajs("sha224")
      .update(JSON.stringify(getOverviewSettings()))
      .digest("hex")

    let useFallback = false

    // Try to use the overview node to find courses
    // If something goes wrong use fallback
    const overviewNode = document.querySelector("[data-region='myoverview']")
    if (overviewNode) {
      const courseNodes = overviewNode.querySelectorAll("[data-region='course-content']")

      if (courseNodes.length !== 0) {
        courseLinks = Array.from(courseNodes).map(n => parseCourseLink(n.innerHTML))
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
          .filter(n => n.href.match(coursePageRegex) && !hasHiddenParent(n))
          .map(n => n.href)
      }
    }

    if (courseLinks.length === 0) {
      // No courses found
      if (retry < maxRetries) {
        // Retry once more because maybe the page was not fully loaded
        console.log("No course found in dashboard. Retrying once more...")
        scanOverview(retry + 1)
        return
      }
    } else {
      // Remove duplicates
      courseLinks = Array.from(new Set(courseLinks))
      // Apply maxCoursesOnDashboardPage option
      courseLinks = courseLinks.slice(0, options.maxCoursesOnDashboardPage)

      scanTotal = courseLinks.length

      if (process.env.NODE_ENV === "debug") {
        console.log(courseLinks)
        return
      }

      const domParser = new DOMParser()
      for (const link of courseLinks) {
        try {
          const res = await fetch(link)
          const resBody = await res.text()
          const HTMLDocument = domParser.parseFromString(resBody, "text/html")

          const course = new Course(link, HTMLDocument)
          await course.scan()
          courses.push(course)
          scanCompleted++
        } catch (err) {
          scanTotal--
          error = true
          console.error(err)
          sendLog({ errorMessage: err.message, url: link })
        }
        sendScanProgress()
      }

      browser.storage.local.set({
        overviewCourseLinks: courses.map(c => c.link),
      })

      updateIconFromCourses(courses)
    }

    scanInProgress = false
    sendScanResults()
  } catch (err) {
    error = true
    console.error(err)
    sendLog({ errorMessage: err.message, url: location.href })
  }
}

const isMoodlePage = checkForMoodle()

if (isMoodlePage) {
  scanOverview()
}

// eslint-disable-next-line @typescript-eslint/ban-types
const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message
  if (command === "scan") {
    if (error) {
      browser.runtime.sendMessage<ErrorViewMessage>({
        command: "error-view",
      })
      return
    }

    if (scanInProgress) {
      sendScanProgress()
    } else {
      if (error) {
        browser.runtime.sendMessage<ErrorViewMessage>({
          command: "error-view",
        })
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
        console.log("empty dashboard")
      }

      sendScanResults()
    }
    return
  }

  if (command === "mark-as-seen") {
    const { link } = message as MarkAsSeenMessage
    const i = courses.findIndex(c => c.link === link)
    const course = courses[i]

    // Update course
    await course.updateStoredResources()
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses(courses)
  }

  if (command === "crawl") {
    const { link } = message as DashboardCrawlMessage
    const i = courses.findIndex(c => c.link === link)
    const course = courses[i]

    const { options }: ExtensionStorage = await browser.storage.local.get("options")

    // Only download new resources
    const downloadNodes = course.resources.filter(r => r.isNew)

    browser.runtime.sendMessage<DownloadMessage>({
      command: "download",
      resources: downloadNodes,
      courseName: course.name,
      courseShortcut: course.shortcut,
      options,
    })

    // Update course
    await course.updateStoredResources(downloadNodes)
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses(courses)
  }
}
browser.runtime.onMessage.addListener(messageListener)
