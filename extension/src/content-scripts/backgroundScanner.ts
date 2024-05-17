import {
  BackgroundCourseScanMessage,
  BackgroundCourseScanResultMessage,
  ExtensionStorage,
  Message,
} from "../types"
import Course from "../models/Course"

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message

  if (command === "bg-course-scan") {
    const { href, html } = message as BackgroundCourseScanMessage
    const document = new DOMParser().parseFromString(html, "text/html")
    const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage
    const course = new Course(href, document, options)
    await course.scan()

    chrome.runtime.sendMessage({
      command: "bg-course-scan-result",
      href,
      nUpdates: course.getNumberOfUpdates(),
    } satisfies BackgroundCourseScanResultMessage)
  }
})
