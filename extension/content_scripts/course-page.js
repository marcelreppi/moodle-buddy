import { scanCourse, updateCourseResources, updateCourseActivities } from "./crawler"
import {
  parseCourseNameFromCoursePage,
  parseCourseShortcut,
  parseCourseLink,
} from "../shared/parser"

let resourceNodes = null
let resourceCounts = null
let activityNodes = null
let activityCounts = null

const courseLink = parseCourseLink(location.href)
const courseName = parseCourseNameFromCoursePage(document)
const courseShortcut = parseCourseShortcut(document)

// browser.storage.local.clear()

scanCourse(courseLink, document).then(scanResult => {
  resourceNodes = scanResult.resourceNodes
  resourceCounts = scanResult.resourceCounts
  activityNodes = scanResult.activityNodes
  activityCounts = scanResult.activityCounts
})

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    const scanResult = await scanCourse(courseLink, document)
    resourceNodes = scanResult.resourceNodes
    resourceCounts = scanResult.resourceCounts
    activityNodes = scanResult.activityNodes
    activityCounts = scanResult.activityCounts

    browser.runtime.sendMessage({
      command: "scan-result",
      resourceNodes,
      activityNodes,
      ...resourceCounts,
      ...activityCounts,
    })
    return
  }

  if (message.command === "mark-as-seen") {
    await updateCourseResources(courseLink)
    await updateCourseActivities(courseLink)
    return
  }

  if (message.command === "update-activities") {
    await updateCourseActivities(courseLink)
    return
  }

  if (message.command === "crawl") {
    const { options } = message

    const downloadNodes = resourceNodes.filter(n => {
      if (options.skipFiles && n.isFile) return false
      if (options.skipFolders && n.isFolder) return false
      if (options.onlyNewResources && !n.isNewResource) return false

      return true
    })

    browser.runtime.sendMessage({
      command: "download",
      resources: downloadNodes,
      courseName,
      courseShortcut,
      options,
    })

    await updateCourseResources(courseLink, downloadNodes)
  }
})
