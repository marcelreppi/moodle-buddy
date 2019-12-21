import { scanCourse, crawlCourse } from "./crawler.js"

let scanInProgress = true
let courses = []

// browser.storage.local.clear()

async function scanForCourses() {
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
    setTimeout(scanForCourses, 200)
  } else {
    const parser = new DOMParser()
    for (let i = 0; i < courseNodes.length; i++) {
      const node = courseNodes[i]
      const courseLink = node.children[0].href
      const res = await fetch(courseLink)
      const resBody = await res.text()
      const HTMLDocument = parser.parseFromString(resBody, "text/html")
      const scanResult = await scanCourse(courseLink, HTMLDocument)
      courses.push({
        name: node.querySelector(".multiline").innerText,
        link: courseLink,
        HTMLDocument,
        ...scanResult,
      })
    }
    // console.log(courses)
    scanInProgress = false
  }
}

scanForCourses()

browser.runtime.onMessage.addListener(async message => {
  console.log(message)
  if (message.command === "scan") {
    if (scanInProgress) {
      browser.runtime.sendMessage({
        command: "scan-in-progress",
      })
    } else {
      console.log(courses)
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
    const course = courses.find(c => c.link === message.link)

    const courseName = course.HTMLDocument.querySelector(".page-header-headings").children[0]
      .textContent
    const courseShortcut = course.HTMLDocument.querySelector("a[aria-current='page']").textContent

    const downloadedResources = []

    for (let i = 0; i < course.resourceNodes.length; i++) {
      const node = course.resourceNodes[i]

      if (!node.isNewResource) continue // Only download new resources

      downloadedResources.push(node)

      await crawlCourse(node, courseName, courseShortcut, message)
    }

    const localStorage = await browser.storage.local.get(courseLink)
    const courseData = localStorage[courseLink]

    console.log(
      Array.from(
        new Set(courseData.oldResources.concat(downloadedResources.map(n => n.href))) // Remove duplicates
      )
    )
    const now = new Date()
    browser.storage.local.set({
      [courseLink]: {
        ...courseData,
        oldResources: Array.from(
          new Set(courseData.oldResources.concat(downloadedResources.map(n => n.href))) // Remove duplicates
        ),
        downloadTimestamp: now.getTime(),
      },
    })
  }
})
