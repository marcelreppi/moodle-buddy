import { scanCourse, downloadResource, updateCourseResources } from "./crawler.js"
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
    await updateCourseResources(courseLink)

    await browser.runtime.sendMessage({
      command: "set-icon-normal",
    })

    return
  }

  if (message.command === "crawl") {
    const { options } = message
    const downloadedResources = []

    for (let i = 0; i < resourceNodes.length; i++) {
      const node = resourceNodes[i]

      if (options.skipFiles && node.mb_isFile) continue
      if (options.skipFolders && node.mb_isFolder) continue
      if (options.onlyNewResources && !node.mb_isNewResource) continue

      downloadedResources.push(node.href)

      await downloadResource(node, courseName, courseShortcut, options)
    }

    await updateCourseResources(courseLink, downloadedResources)

    await browser.runtime.sendMessage({
      command: "set-icon-normal",
    })

    return
  }
})
