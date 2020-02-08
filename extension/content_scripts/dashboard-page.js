import shajs from "sha.js"

import { checkForMoodle, parseCourseLink } from "../shared/parser"
import { updateIconFromCourses } from "../shared/helpers"
import Course from "../models/Course"

let overviewHidden = false
let scanInProgress = true
let scanTotal = 0
let scanCompleted = 0
let courses = []
let lastSettingsHash = ""

function getOverviewSettings() {
  const settingsDiv = document.querySelector("[data-region='courses-view'")
  if (settingsDiv) {
    return settingsDiv.dataset
  }

  return null
}

async function scanOverview() {
  scanInProgress = true
  scanTotal = 0
  scanCompleted = 0
  courses = []

  // Save hash of settings to check for changes
  lastSettingsHash = shajs("sha224")
    .update(JSON.stringify(getOverviewSettings()))
    .digest("hex")

  const overviewNode = document.querySelector("[data-region='myoverview']")

  if (!overviewNode) {
    // Overview is hidden
    overviewHidden = true
    scanInProgress = false
    return
  }

  const emptyCourseList = overviewNode.querySelector("[data-region='empty-message']")
  if (emptyCourseList) {
    // There are no courses shown
    scanInProgress = false
    return
  }

  const courseNodes = overviewNode.querySelectorAll("[data-region='course-content']")
  if (courseNodes.length === 0) {
    // Check again if courses have not loaded yet
    setTimeout(scanOverview, 200)
  } else {
    // Overview page has fully loaded
    // console.log(courseNodes)
    scanTotal = courseNodes.length
    const domParser = new DOMParser()
    for (let i = 0; i < courseNodes.length; i++) {
      const node = courseNodes[i]
      const courseLink = parseCourseLink(node.innerHTML)
      const res = await fetch(courseLink)
      const resBody = await res.text()
      const HTMLDocument = domParser.parseFromString(resBody, "text/html")

      const course = new Course(courseLink, HTMLDocument)
      await course.scan()
      courses.push(course)
      scanCompleted++
    }

    browser.storage.local.set({
      overviewCourseLinks: courses.map(c => c.link),
    })

    updateIconFromCourses(courses)
    scanInProgress = false
  }
}

const isMoodlePage = checkForMoodle()

if (isMoodlePage) {
  scanOverview()

  browser.runtime.sendMessage({
    command: "page-data",
    page: "dashboard",
    HTMLString: document.querySelector("html").outerHTML,
  })
}

browser.runtime.onMessage.addListener(async message => {
  // console.log(message)
  if (message.command === "scan") {
    if (scanInProgress) {
      browser.runtime.sendMessage({
        command: "scan-in-progress",
        completed: scanCompleted,
        total: scanTotal,
      })
    } else {
      const currentSettingsHash = shajs("sha224")
        .update(JSON.stringify(getOverviewSettings()))
        .digest("hex")

      if (currentSettingsHash !== lastSettingsHash) {
        // User has modified the overview -> Repeat the scan
        scanOverview()
        browser.runtime.sendMessage({
          command: "scan-in-progress",
        })
        return
      }

      browser.runtime.sendMessage({
        command: "scan-result",
        overviewHidden,
        courses: courses.map(c => ({
          name: c.name,
          link: c.link,
          isNew: c.isFirstScan,
          resourceNodes: c.resourceNodes,
          activityNodes: c.activityNodes,
          ...c.resourceCounts,
          ...c.activityCounts,
        })),
      })
    }

    return
  }

  if (message.command === "mark-as-seen") {
    const i = courses.findIndex(c => c.link === message.link)
    const course = courses[i]

    // Update course
    await course.updateStoredResources()
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses(courses)
  }

  if (message.command === "crawl") {
    const i = courses.findIndex(c => c.link === message.link)
    const course = courses[i]

    const { options } = await browser.storage.local.get("options")

    // Only download new resources
    const downloadNodes = course.resourceNodes.filter(node => node.isNewResource)

    browser.runtime.sendMessage({
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
})
