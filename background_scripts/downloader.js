import { sendEvent } from "../shared/sendEvent.js"

browser.runtime.onMessage.addListener(message => {
  if (message.command === "download") {
    let filename = message.url.split("/").pop()
    const filenameParts = filename.split(".")
    const fileType = filenameParts[filenameParts.length - 1]

    if (message.useMoodleFilename) {
      filename = `${message.moodleFilename}.${fileType}`
    }

    if (message.prependCourseToFilename) {
      filename = `${message.courseName}_${filename}`
    }

    if (message.prependCourseShortcutToFilename) {
      filename = `${message.courseShortcut}_${filename}`
    }

    browser.downloads.download({
      url: message.url,
      filename,
    })
    return
  }

  if (message.command === "download-folder") {
    let filename = `${message.folderName}.zip`

    if (message.prependCourseToFilename) {
      filename = `${message.courseName}_${filename}`
    }

    if (message.prependCourseShortcutToFilename) {
      filename = `${message.courseShortcut}_${filename}`
    }

    browser.downloads.download({
      url: message.url,
      filename,
    })
    return
  }

  if (message.command === "download-folder-file") {
    let filename = `${message.folderName}_${message.filename}`

    if (message.prependCourseToFilename) {
      filename = `${message.courseName}_${filename}`
    }

    if (message.prependCourseShortcutToFilename) {
      filename = `${message.courseShortcut}_${filename}`
    }

    browser.downloads.download({
      url: message.url,
      filename,
    })
    return
  }
})

browser.runtime.onInstalled.addListener(details => {
  switch (details.reason) {
    case "install":
      sendEvent("install")
      break
    case "update":
      sendEvent("update")
      break
    default:
      break
  }
})
