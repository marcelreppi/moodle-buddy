const sanitizeFilename = (filename, connectingString = "") => {
  return filename.trim().replace(/\\|\/|:|\*|\?|"|<|>|\|/gi, connectingString)
}

browser.runtime.onMessage.addListener(message => {
  let courseName = ""
  let courseShortcut = ""
  if (message.command.startsWith("download")) {
    courseName = sanitizeFilename(message.courseName)
    courseShortcut = sanitizeFilename(message.courseShortcut, "_")
  }

  if (message.command === "download-file") {
    let filename = message.filename
    const filenameParts = filename.split(".")
    const fileType = filenameParts[filenameParts.length - 1]

    if (message.useMoodleFilename) {
      const moodleFilename = sanitizeFilename(message.moodleFilename)
      filename = `${moodleFilename}.${fileType}`
    }

    if (message.prependCourseToFilename) {
      filename = `${courseName}_${filename}`
    }

    if (message.prependCourseShortcutToFilename) {
      filename = `${courseShortcut}_${filename}`
    }

    browser.downloads.download({
      url: message.url,
      filename,
    })
    return
  }

  if (message.command === "download-folder") {
    const folderName = sanitizeFilename(message.folderName)
    let filename = `${folderName}.zip`
    if (message.prependCourseToFilename) {
      filename = `${courseName}_${filename}`
    }
    if (message.prependCourseShortcutToFilename) {
      filename = `${courseShortcut}_${filename}`
    }
    browser.downloads.download({
      url: message.url,
      filename,
    })
    return
  }

  if (message.command === "download-folder-file") {
    let filename = sanitizeFilename(message.filename)
    const folderName = sanitizeFilename(folderName)
    filename = `${folderName}_${filename}`
    if (message.prependCourseToFilename) {
      filename = `${courseName}_${filename}`
    }
    if (message.prependCourseShortcutToFilename) {
      filename = `${courseShortcut}_${filename}`
    }
    browser.downloads.download({
      url: message.url,
      filename,
    })
    return
  }
})
