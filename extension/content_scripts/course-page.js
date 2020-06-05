import { checkForMoodle, parseCourseLink } from "../shared/parser"
import { updateIconFromCourses, sendLog } from "../shared/helpers"
import Course from "../models/Course"

const courseLink = parseCourseLink(location.href)
const course = new Course(courseLink, document)
let error = false

// browser.storage.local.clear()

const isMoodlePage = checkForMoodle()
if (isMoodlePage) {
  // Initial scan
  course
    .scan()
    .then(() => {
      updateIconFromCourses(course)

      if (process.env.NODE_ENV === "debug") {
        console.log(course)
      }
    })
    .catch(err => {
      console.error(err)
      error = true
      sendLog({ errorMessage: err.message, url: location.href })
    })
}

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    // await course.scan()
    // updateIconFromCourses(course)

    browser.runtime.sendMessage({
      command: "page-data",
      page: "course",
      HTMLString: document.querySelector("html").outerHTML,
    })

    if (error) {
      browser.runtime.sendMessage({
        command: "error-view",
      })
      return
    }

    browser.runtime.sendMessage({
      command: "scan-result",
      resourceNodes: course.resourceNodes,
      activityNodes: course.activityNodes,
      ...course.resourceCounts,
      ...course.activityCounts,
    })
    return
  }

  if (message.command === "mark-as-seen") {
    await course.updateStoredResources()
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses(course)
    return
  }

  if (message.command === "update-activities") {
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses(course)
    return
  }

  if (message.command === "crawl") {
    const { options, selectedResources } = message

    browser.runtime.sendMessage({
      command: "download",
      resources: selectedResources,
      courseName: course.name,
      courseShortcut: course.shortcut,
      options,
    })

    await course.updateStoredResources(selectedResources)
    await course.scan()
    updateIconFromCourses(course)
  }
})
