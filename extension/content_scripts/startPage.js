import shajs from "sha.js"

import { scanCourse, downloadResource, updateCourseResources } from "./crawler.js"
import * as parser from "./parser.js"
import { filterMoodleBuddyKeys } from "../shared/helpers.js"

let scanInProgress = true
let courses = []
let lastOverviewHash = ""

// browser.storage.local.clear()

function getOverviewNode() {
  return document.querySelector("[data-region='myoverview']")
}

async function scanOverview() {
  scanInProgress = true
  courses = []

  const overviewNode = getOverviewNode()
  // Save hash to check for changes
  lastOverviewHash = shajs("sha224")
    .update(overviewNode.innerHTML)
    .digest("hex")

  if (!overviewNode) {
    // Overview is hidden
    scanInProgress = false
    return
  }

  const emptyCourseList = overviewNode.querySelector("[data-region='empty-message']")
  if (emptyCourseList) {
    // There are no courses shown
    scanInProgress = false
    return
  }

  let courseNodes = overviewNode.querySelectorAll("[data-region='course-content']")
  if (courseNodes.length === 0) {
    // Check again if courses have not loaded yet
    setTimeout(scanOverview, 200)
  } else {
    // Overview page has fully loaded
    // console.log(courseNodes)
    const domParser = new DOMParser()
    for (let i = 0; i < courseNodes.length; i++) {
      const node = courseNodes[i]
      const courseLink = parser.parseCourseLink(node.innerHTML)
      const res = await fetch(courseLink)
      const resBody = await res.text()
      const HTMLDocument = domParser.parseFromString(resBody, "text/html")
      const scanResult = await scanCourse(courseLink, HTMLDocument)
      courses.push({
        name: parser.parseCourseNameFromCard(node),
        link: courseLink,
        HTMLDocument,
        ...scanResult,
      })
    }

    scanInProgress = false
  }
}

function checkForUpdates() {
  // If there are no further updates reset the icon
  const noMoreUpdates = courses.every(c => {
    const { nNewFiles, nNewFolders } = c.resourceCounts
    return nNewFiles + nNewFolders === 0
  })
  if (noMoreUpdates) {
    browser.runtime.sendMessage({
      command: "set-icon-normal",
    })
  } else {
    browser.runtime.sendMessage({
      command: "set-icon-new",
    })
  }
}

scanOverview()

browser.runtime.onMessage.addListener(async message => {
  // console.log(message)
  if (message.command === "scan") {
    if (scanInProgress) {
      browser.runtime.sendMessage({
        command: "scan-in-progress",
      })
    } else {
      const currentOverviewHash = shajs("sha224")
        .update(getOverviewNode().innerHTML)
        .digest("hex")

      if (currentOverviewHash !== lastOverviewHash) {
        // User has modified the overview -> Repeat the scan
        scanOverview()
        browser.runtime.sendMessage({
          command: "scan-in-progress",
        })
        return
      }

      checkForUpdates()

      browser.runtime.sendMessage({
        command: "scan-result",
        courses: courses.map(c => {
          return {
            name: c.name,
            link: c.link,
            isNew: c.isFirstScan,
            resourceNodes: c.resourceNodes.map(filterMoodleBuddyKeys),
            ...c.resourceCounts,
          }
        }),
      })
    }

    return
  }

  if (message.command === "mark-as-seen") {
    const i = courses.findIndex(c => c.link === message.link)
    const course = courses[i]

    await updateCourseResources(course.link)

    // Update course
    const scanResult = await scanCourse(course.link, course.HTMLDocument)
    courses[i] = {
      ...course,
      ...scanResult,
    }

    checkForUpdates()
  }

  if (message.command === "crawl") {
    const i = courses.findIndex(c => c.link === message.link)
    const course = courses[i]

    const { options } = await browser.storage.local.get("options")

    const courseName = parser.parseCourseNameFromCoursePage(course.HTMLDocument)
    const courseShortcut = parser.parseCourseShortcut(course.HTMLDocument)

    const downloadedResources = []

    for (let i = 0; i < course.resourceNodes.length; i++) {
      const node = course.resourceNodes[i]

      if (!node.mb_isNewResource) continue // Only download new resources

      downloadedResources.push(node.href)

      await downloadResource(node, courseName, courseShortcut, options)
    }

    await updateCourseResources(course.link, downloadedResources)

    // Update course
    const scanResult = await scanCourse(course.link, course.HTMLDocument)
    courses[i] = {
      ...course,
      ...scanResult,
    }

    checkForUpdates()
  }
})
