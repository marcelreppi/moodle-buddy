import {
  CourseCrawlMessage,
  CourseScanResultMessage,
  DownloadMessage,
  ExtensionStorage,
  Message,
} from "types"
import { checkForMoodle, parseCourseLink } from "@shared/parser"
import { updateIconFromCourses, sendLog, getCourseDownloadId } from "@shared/helpers"

import Course from "../models/Course"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

function sendScanResults(course) {
  chrome.runtime.sendMessage({
    command: COMMANDS.SCAN_RESULT,
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

      initialScanCompleted = true
      sendScanResults(course)
    })
    .catch((err) => {
      logger.error(err)
      sendLog({ errorMessage: err.message, url: location.href, page: "course" })
      chrome.runtime.sendMessage({
        command: COMMANDS.ERROR_VIEW,
      } satisfies Message)
    })

  chrome.runtime.onMessage.addListener(async (message: Message) => {
    const { command } = message

    if (command === COMMANDS.INIT_SCAN) {
      if (initialScanCompleted) {
        sendScanResults(course)
      }
      return
    }

    if (command === COMMANDS.MARK_AS_SEEN) {
      await course.updateStoredResources()
      await course.updateStoredActivities()
      await course.scan()
      updateIconFromCourses([course])
      return
    }

    if (command === COMMANDS.UPDATE_ACTIVITIES) {
      await course.updateStoredActivities()
      await course.scan()
      updateIconFromCourses([course])
      return
    }

    if (command === COMMANDS.COURSE_CRAWL) {
      const { options, selectedResources } = message as CourseCrawlMessage

      chrome.runtime.sendMessage({
        command: COMMANDS.DOWNLOAD,
        id: getCourseDownloadId(command, course),
        courseName: course.name,
        courseShortcut: course.shortcut,
        courseLink: course.link,
        resources: selectedResources,
        options,
      } satisfies DownloadMessage)

      await course.updateStoredResources(selectedResources)
      await course.scan()
      updateIconFromCourses([course])
    }

    if (command === COMMANDS.ENSURE_CORRECT_BADGE) {
      updateIconFromCourses([course])
    }
  })
}

const isMoodlePage = checkForMoodle()

if (isMoodlePage) {
  initCoursePage()
}
