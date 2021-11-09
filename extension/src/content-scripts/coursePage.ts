import { CourseCrawlMessage, CourseScanResultMessage, DownloadMessage, Message } from "types"
import { checkForMoodle, parseCourseLink } from "../shared/parser"
import { updateIconFromCourses, sendLog } from "../shared/helpers"

import Course from "../models/Course"

const courseLink = parseCourseLink(location.href)
const course = new Course(courseLink, document)
let initialScanCompleted = false

function sendScanResults() {
  browser.runtime.sendMessage<CourseScanResultMessage>({
    command: "scan-result",
    course: {
      resources: course.resources,
      activities: course.activities,
    },
  })
}

// browser.storage.local.clear()

const isMoodlePage = checkForMoodle()
if (isMoodlePage) {
  // Initial scan
  course
    .scan()
    .then(() => {
      updateIconFromCourses([course])

      if (process.env.NODE_ENV !== "production") {
        console.log(course)
      }

      initialScanCompleted = true
      sendScanResults()
    })
    .catch((err) => {
      console.error(err)
      sendLog({ errorMessage: err.message, url: location.href })
      browser.runtime.sendMessage<Message>({
        command: "error-view",
      })
    })
}

const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message

  if (command === "scan") {
    if (initialScanCompleted) {
      sendScanResults()
    }
    return
  }

  if (command === "mark-as-seen") {
    await course.updateStoredResources()
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses([course])
    return
  }

  if (command === "update-activities") {
    await course.updateStoredActivities()
    await course.scan()
    updateIconFromCourses([course])
    return
  }

  if (command === "crawl") {
    const { options, selectedResources } = message as CourseCrawlMessage

    browser.runtime.sendMessage<DownloadMessage>({
      command: "download",
      resources: selectedResources,
      courseName: course.name,
      courseShortcut: course.shortcut,
      options,
    })

    await course.updateStoredResources(selectedResources)
    await course.scan()
    updateIconFromCourses([course])
  }
}
browser.runtime.onMessage.addListener(messageListener)
