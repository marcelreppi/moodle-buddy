import { CourseCrawlMessage, DownloadMessage, ExtensionStorage, Message } from "types"
import { checkForMoodle } from "@shared/parser"
import { getCourseDownloadId, sendLog } from "@shared/helpers"

import CourseSection from "../models/CourseSection"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"
import { sendScanResults } from "./shared"

async function initCourseSectionPage() {
  const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage
  const courseSection = new CourseSection(location.href, document, options)
  let initialScanCompleted = false

  courseSection
    .scan()
    .then(() => {
      initialScanCompleted = true
      sendScanResults(courseSection)
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
        sendScanResults(courseSection)
      }
      return
    }

    if (command === COMMANDS.COURSE_CRAWL) {
      const { options, selectedResources } = message as CourseCrawlMessage

      chrome.runtime.sendMessage({
        command: COMMANDS.DOWNLOAD,
        id: getCourseDownloadId(command, courseSection),
        courseName: courseSection.name,
        courseShortcut: courseSection.shortcut,
        courseLink: courseSection.link,
        resources: selectedResources,
        options,
      } satisfies DownloadMessage)
    }
  })
}

const isMoodlePage = checkForMoodle()

if (isMoodlePage) {
  initCourseSectionPage()
}
