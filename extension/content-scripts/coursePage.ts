import {
  CourseCrawlMessage,
  CourseScanResultMessage,
  DownloadMessage,
  Message,
} from "extension/types/messages.types"
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
      updateIconFromCourses([course])

      if (process.env.NODE_ENV !== "production") {
        console.log(course)
      }
    })
    .catch((err) => {
      console.error(err)
      error = true
      sendLog({ errorMessage: err.message, url: location.href })
    })
}

// eslint-disable-next-line @typescript-eslint/ban-types
const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message

  if (command === "scan") {
    // await course.scan()
    // updateIconFromCourses(course)

    if (error) {
      browser.runtime.sendMessage<Message>({
        command: "error-view",
      })
      return
    }

    browser.runtime.sendMessage<CourseScanResultMessage>({
      command: "scan-result",
      course: {
        resources: course.resources,
        activities: course.activities,
        counts: course.counts,
      },
    })
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
