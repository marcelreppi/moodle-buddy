import {
  CourseCrawlMessage,
  CourseScanResultMessage,
  DownloadMessage,
  ExtensionStorage,
  Message,
} from "types"
import { checkForMoodle, parseCourseLink } from "../shared/parser"
import { updateIconFromCourses, sendLog, isDev } from "../shared/helpers"

import Course from "../models/Course"

function sendScanResults(course) {
  browser.runtime.sendMessage<CourseScanResultMessage>({
    command: "scan-result",
    course: {
      resources: course.resources,
      activities: course.activities,
    },
  })
}

// browser.storage.local.clear()

async function initCoursePage() {
  const { options }: ExtensionStorage = await browser.storage.local.get("options")
  const courseLink = parseCourseLink(location.href)
  const course = new Course(courseLink, document, options)

  let initialScanCompleted = false

  // Initial scan
  course
    .scan()
    .then(() => {
      updateIconFromCourses([course])

      if (isDev) {
        console.log(course)
      }

      initialScanCompleted = true
      sendScanResults(course)
    })
    .catch((err) => {
      console.error(err)
      sendLog({ errorMessage: err.message, url: location.href })
      browser.runtime.sendMessage<Message>({
        command: "error-view",
      })
    })

  const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
    const { command } = message as Message

    if (command === "scan") {
      if (initialScanCompleted) {
        sendScanResults(course)
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
}

const isMoodlePage = checkForMoodle()

if (isMoodlePage) {
  initCoursePage()
}
