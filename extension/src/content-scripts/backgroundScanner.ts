import {
  BackgroundCourseScanMessage,
  BackgroundCourseScanResultMessage,
  ExtensionStorage,
  Message,
} from "@types"
import Course from "../models/Course"
import { COMMANDS } from "@shared/constants"

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message

  if (command === COMMANDS.BG_COURSE_SCAN) {
    const { href, html } = message as BackgroundCourseScanMessage
    const document = new DOMParser().parseFromString(html, "text/html")
    const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage
    const course = new Course(href, document, options)
    await course.scan()

    chrome.runtime.sendMessage({
      command: COMMANDS.BG_COURSE_SCAN_RESULT,
      href,
      nUpdates: course.getNumberOfUpdates(),
    } satisfies BackgroundCourseScanResultMessage)
  }
})
