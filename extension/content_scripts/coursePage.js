import { scanCourse, downloadResource } from "./crawler.js"
import { parseCourseNameFromCoursePage, parseCourseShortcut, parseCourseLink } from "./parser.js"
import { filterMoodleBuddyKeys } from "../shared/helpers.js"

let resourceNodes = null
let resourceCounts = null

const courseLink = parseCourseLink(location.href)
const courseName = parseCourseNameFromCoursePage(document)
const courseShortcut = parseCourseShortcut(document)

scanCourse(courseLink, document).then(result => {
  resourceNodes = result.resourceNodes
  resourceCounts = result.resourceCounts
})

// browser.storage.local.clear()

browser.runtime.onMessage.addListener(async message => {
  const localStorage = await browser.storage.local.get()

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

    // Update course
    await scanCourse(courseLink, document)

    browser.runtime.sendMessage({
      command: "set-icon-normal",
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

    const courseData = localStorage[courseLink]

    await browser.storage.local.set({
      [courseLink]: {
        ...courseData,
        seenResources: Array.from(
          new Set(courseData.seenResources.concat(downloadedResources.map(n => n.href))) // Remove duplicates
        ),
        lastDownload: new Date().getTime(),
      },
    })

    // Update course
    await scanCourse(courseLink, document)

    browser.runtime.sendMessage({
      command: "set-icon-normal",
    })

    return
  }
})
