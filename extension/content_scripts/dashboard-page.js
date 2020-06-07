import shajs from "sha.js"

import { checkForMoodle, parseCourseLink } from "../shared/parser"
import { coursePageRegex, updateIconFromCourses, sendLog } from "../shared/helpers"
import Course from "../models/Course"

let error = false
let unknownLayout = false
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

function hasHiddenParent(element) {
  if (element === document) return false
  if (getComputedStyle(element).display === "none" || element.hidden) return true
  return element.parentNode && hasHiddenParent(element.parentNode)
}

async function scanOverview() {
  try {
    scanInProgress = true
    scanTotal = 0
    scanCompleted = 0
    courses = []

    let courseLinks = []

    // Save hash of settings to check for changes
    lastSettingsHash = shajs("sha224")
      .update(JSON.stringify(getOverviewSettings()))
      .digest("hex")

    const overviewNode = document.querySelector("[data-region='myoverview']")

    if (overviewNode) {
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
        return
      }

      // Overview page has fully loaded
      scanTotal = courseNodes.length
      courseLinks = Array.from(courseNodes).map(n => parseCourseLink(n.innerHTML))
    } else {
      overviewHidden = true
      // Sleep some time to wait for full page load
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Some moodle platforms have this data block as overview
      let searchRoot = document.querySelector("[data-block='course_overview_campus'")

      if (!searchRoot) {
        // Fallback to more general (outer) element
        searchRoot = document.querySelector("#region-main")
      }

      courseLinks = Array.from(
        new Set(
          Array.from(searchRoot.querySelectorAll("a"))
            .filter(n => n.href.match(coursePageRegex) && !hasHiddenParent(n))
            .map(n => n.href)
        )
      )

      if (courseLinks.length === 0) {
        if (process.env.NODE_ENV === "debug") {
          console.log(courseLinks)
        }

        unknownLayout = true
        scanInProgress = false
        return
      }
    }

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
        error = true
        console.error(err)
        sendLog({ errorMessage: err.message, url: link })
      }
    }

    browser.storage.local.set({
      overviewCourseLinks: courses.map(c => c.link),
    })

    updateIconFromCourses(courses)
    scanInProgress = false
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

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    if (error) {
      browser.runtime.sendMessage({
        command: "error-view",
      })
      return
    }

    if (scanInProgress) {
      browser.runtime.sendMessage({
        command: "scan-in-progress",
        completed: scanCompleted,
        total: scanTotal,
      })
    } else {
      if (error) {
        browser.runtime.sendMessage({
          command: "error-view",
        })
        return
      }

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
        unknownLayout,
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
