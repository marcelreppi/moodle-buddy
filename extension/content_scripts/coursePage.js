import { scanCourse, downloadResource } from "./crawler.js"
import { parseCourseNameFromCoursePage, parseCourseShortcut } from "./parser.js"
import { filterMoodleBuddyKeys } from "../shared/helpers.js"

let resourceNodes = null
let resourceCounts = null

const courseLink = location.href
const courseName = parseCourseNameFromCoursePage(document)
const courseShortcut = parseCourseShortcut(document)

scanCourse(courseLink, document).then(result => {
  resourceNodes = result.resourceNodes
  resourceCounts = result.resourceCounts
})

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    const scanResult = await scanCourse(courseLink, document)
    resourceNodes = scanResult.resourceNodes
    resourceCounts = scanResult.resourceCounts

    browser.runtime.sendMessage({
      command: "scan-result",
      resourceNodes: resourceNodes.map(filterMoodleBuddyKeys),
      ...resourceCounts,
    })
    return
  }

  if (message.command === "mark-as-seen") {
    const localStorage = await browser.storage.local.get(courseLink)
    const storedCourseData = localStorage[courseLink]

    // Merge already seen resources with downloaded resources
    // Use set to remove duplicates
    const updatedSeenResources = Array.from(
      new Set(storedCourseData.seenResources.concat(storedCourseData.newResources))
    )
    await browser.storage.local.set({
      [courseLink]: {
        ...storedCourseData,
        seenResources: updatedSeenResources,
      },
    })

    return
  }

  if (message.command === "crawl") {
    const downloadedResources = []

    for (let i = 0; i < resourceNodes.length; i++) {
      const node = resourceNodes[i]

      if (message.skipFiles && node.mb_isFile) continue
      if (message.skipFolders && node.mb_isFolder) continue
      if (message.onlyNewResources && !node.mb_isNewResource) continue

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
