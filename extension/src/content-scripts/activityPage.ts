import {
  CourseCrawlMessage,
  PageScanResultMessage,
  DownloadMessage,
  ExtensionStorage,
  Message,
} from "types"
import { checkForMoodle, parseCourseLink } from "@shared/parser"
import { getCourseDownloadId, sendLog } from "@shared/helpers"

import CourseActivity from "../models/CourseActivity"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"
import { sendScanResults } from "./shared"

async function initActivityPage() {
  const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage
  const activityLink = parseCourseLink(location.href)
  const activity = new CourseActivity(activityLink, document, options)

  let initialScanCompleted = false

  activity
    .scan()
    .then(() => {
      initialScanCompleted = true
      sendScanResults(activity)
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
        sendScanResults(activity)
      }
      return
    }

    if (command === COMMANDS.COURSE_CRAWL) {
      const { options, selectedResources } = message as CourseCrawlMessage

      chrome.runtime.sendMessage({
        command: COMMANDS.DOWNLOAD,
        id: getCourseDownloadId(command, activity),
        courseName: activity.name,
        courseShortcut: activity.shortcut,
        courseLink: activity.link,
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
