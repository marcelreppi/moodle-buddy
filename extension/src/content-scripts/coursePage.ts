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
  chrome.runtime.sendMessage({
    command: "scan-result",
    course: {
      resources: course.resources,
      activities: course.activities,
    },
  } satisfies CourseScanResultMessage)
}

// chrome.storage.local.clear()

async function initCoursePage() {
  const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage
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
      chrome.runtime.sendMessage({
        command: "error-view",
      } satisfies Message)
    })

  chrome.runtime.onMessage.addListener(async (message: Message) => {
    const { command } = message

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

      chrome.runtime.sendMessage({
        command: "download",
        resources: selectedResources,
        courseName: course.name,
        courseShortcut: course.shortcut,
        options,
      } satisfies DownloadMessage)

      await course.updateStoredResources(selectedResources)
      await course.scan()
      updateIconFromCourses([course])
    }
  })
}

const isMoodlePage = checkForMoodle()

if (isMoodlePage) {
  initCoursePage()
}
