import { scanCourse, downloadResource, updateCourseResources } from "./crawler"
import { parseCourseNameFromCoursePage, parseCourseShortcut, parseCourseLink } from "./parser"
import { filterMoodleBuddyKeys } from "../shared/helpers"

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

    const downloadedResourceNodes = resourceNodes.filter(n => {
      if (options.skipFiles && n.mb_isFile) return false
      if (options.skipFolders && n.mb_isFolder) return false
      if (options.onlyNewResources && !n.mb_isNewResource) return false

      return true
    })

    downloadedResourceNodes.forEach(node => {
      downloadResource(node, courseName, courseShortcut, options)
    })

    await updateCourseResources(courseLink, downloadedResourceNodes)

    await browser.runtime.sendMessage({
      command: "set-icon-normal",
    })
  }
})
