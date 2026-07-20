import {
  CourseCrawlMessage,
  CourseScanResultMessage,
  DownloadMessage,
  ExtensionStorage,
  Message,
} from "types"
import { checkForMoodle, parseCourseLink } from "@shared/parser"
import { getCourseDownloadId, sendLog } from "@shared/helpers"

import Course from "../models/Course"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

function sendScanResults(course) {
  chrome.runtime.sendMessage({
    command: COMMANDS.SCAN_RESULT,
    course: {
      resources: course.resources,
      activities: [],
    },
  } satisfies CourseScanResultMessage)
}

async function initActivityPage() {
  const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage
  const activityLink = parseCourseLink(location.href)
  const course = new Course(activityLink, document, options)

  let initialScanCompleted = false

  course.scan()
    .then(() => {
      initialScanCompleted = true
      sendScanResults(course)
    })
    .catch((err) => {
      logger.error(err)
      sendLog({ errorMessage: err.message, url: location.href, page: "activity" })
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
    }
  })
}

const isMoodlePage = checkForMoodle()

if (isMoodlePage) {
  initActivityPage()
}
