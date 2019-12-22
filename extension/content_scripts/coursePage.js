import { scanCourse, downloadResource } from "./crawler.js"
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
      if (message.onlyNewResources && !node.isNewResource) continue

      downloadedResources.push(node)

      await downloadResource(node, courseName, courseShortcut, message)
    }

    const localStorage = await browser.storage.local.get(courseLink)
    const courseData = localStorage[courseLink]

    browser.storage.local.set({
      [courseLink]: {
        ...courseData,
        seenResources: Array.from(
          new Set(courseData.seenResources.concat(downloadedResources.map(n => n.href))) // Remove duplicates
        ),
        lastDownload: new Date().getTime(),
      },
    })

    return
  }
})
