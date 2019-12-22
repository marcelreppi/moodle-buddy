import { scanCourse, crawlCourse } from "./crawler.js"
import { parseCourseName, parseCourseShortcut } from "./parser"

let resourceNodes = null
let resourceCounts = null

const courseLink = location.href
const courseName = parseCourseName(document)
const courseShortcut = parseCourseShortcut(document)

scanCourse(courseLink, document).then(result => {
  resourceNodes = result.resourceNodes
  resourceCounts = result.resourceCounts
})

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    browser.runtime.sendMessage({
      command: "scan-result",
      ...resourceCounts,
    })
    return
  }

  if (message.command === "crawl") {
    const downloadedResources = []

    for (let i = 0; i < resourceNodes.length; i++) {
      const node = resourceNodes[i]

      if (message.skipDocuments && node.isDocument) continue
      if (message.skipFolders && node.isFolder) continue

      if (message.onlyNewResources) {
        // Skip already downloaded resources
        if (node.isNewResource || node.isNonDownloadResource) {
          continue
        }
      }

      downloadedResources.push(node)

      await crawlCourse(node, courseName, courseShortcut, message)
    }

    const localStorage = await browser.storage.local.get(courseLink)
    const courseData = localStorage[courseLink]

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

    return
  }
})
