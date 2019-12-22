import { scanCourse, crawlCourse } from "./crawler.js"
import * as parser from "./parser"

let scanInProgress = true
let courses = []

// browser.storage.local.clear()

async function scanOverview() {
  courses = []

  const overviewNode = document.querySelector("div[data-region='myoverview']")
  if (!overviewNode) {
    // Overview is hidden
    // console.log("hidden list")
    scanInProgress = false
    return
  }

  const emptyCourseList = overviewNode.querySelector("div[data-region='empty-message']")
  if (emptyCourseList) {
    // There are no courses shown
    // console.log("empty list")
    scanInProgress = false
    return
  }

  let courseNodes = overviewNode.querySelectorAll("div[data-region='course-content']")
  if (courseNodes.length === 0) {
    // Check again if courses have not loaded yet
    setTimeout(scanOverview, 200)
  } else {
    // Overview page has fully loaded
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

scanOverview()

browser.runtime.onMessage.addListener(async message => {
  console.log(message)
  if (message.command === "scan") {
    if (scanInProgress) {
      browser.runtime.sendMessage({
        command: "scan-in-progress",
      })
    } else {
      browser.runtime.sendMessage({
        command: "scan-result",
        courses: courses.map(c => {
          return {
            name: c.name,
            link: c.link,
            ...c.resourceCounts,
          }
        }),
      })
    }

    return
  }

  if (message.command === "crawl") {
    const i = courses.findIndex(c => c.link === message.link)
    const course = courses[i]

    const courseName = parser.parseCourseName(course.HTMLDocument)
    const courseShortcut = parser.parseCourseShortcut(course.HTMLDocument)

    const downloadedResources = []

    for (let i = 0; i < course.resourceNodes.length; i++) {
      const node = course.resourceNodes[i]

      if (!node.isNewResource) continue // Only download new resources

      downloadedResources.push(node)

      await crawlCourse(node, courseName, courseShortcut)
    }

    const localStorage = await browser.storage.local.get(course.link)
    const storedCourseData = localStorage[course.link]

    await browser.storage.local.set({
      [course.link]: {
        ...storedCourseData,
        oldResources: Array.from(
          new Set(storedCourseData.oldResources.concat(downloadedResources.map(n => n.href))) // Remove duplicates
        ),
      },
    })

    // Update course
    const scanResult = await scanCourse(course.link, course.HTMLDocument)
    courses[i] = {
      ...course,
      ...scanResult,
    }
  }
})
