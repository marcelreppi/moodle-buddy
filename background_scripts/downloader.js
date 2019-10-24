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

function sendEvent(event) {
  return
  const now = new Date()
  const isFirefox = typeof InstallTrigger !== "undefined"
  fetch(
    "https://e3hfofu2w1.execute-api.eu-central-1.amazonaws.com/default/tu-berlin-isis-course-crawler-event-tracker", // TODO: Make new lambda
    {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        event,
        date: now.toLocaleDateString("de-DE"),
        time: now.toLocaleTimeString("de-DE"),
        browser: isFirefox ? "firefox" : "chrome",
      }),
    }
  )
}

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
