const sanitizeFileName = (fileName, connectingString = "") =>
  fileName.trim().replace(/\\|\/|:|\*|\?|"|<|>|\|/gi, connectingString)

browser.runtime.onMessage.addListener(message => {
  let courseName = ""
  let courseShortcut = ""
  if (message.command.startsWith("download")) {
    courseName = sanitizeFileName(message.courseName)
    courseShortcut = sanitizeFileName(message.courseShortcut, "_")
  }

  if (message.command === "download-file") {
    let { fileName } = message
    const fileNameParts = fileName.split(".")
    const fileType = fileNameParts[fileNameParts.length - 1]

    if (message.useMoodleFileName) {
      const moodleFileName = sanitizeFileName(message.moodleFileName)
      fileName = `${moodleFileName}.${fileType}`
    }

    if (message.prependCourseToFileName) {
      fileName = `${courseName}_${fileName}`
    }

    if (message.prependCourseShortcutToFileName) {
      fileName = `${courseShortcut}_${fileName}`
    }

    if (message.saveToFolder) {
      fileName = `${courseName}/${fileName}`
    }

    browser.downloads.download({
      url: message.url,
      filename: fileName,
    })
    return
  }

  if (message.command === "download-folder") {
    const folderName = sanitizeFileName(message.folderName)
    let fileName = `${folderName}.zip`
    if (message.prependCourseToFileName) {
      fileName = `${courseName}_${fileName}`
    }
    if (message.prependCourseShortcutToFileName) {
      fileName = `${courseShortcut}_${fileName}`
    }
    if (message.saveToFolder) {
      fileName = `${courseName}/${fileName}`
    }
    browser.downloads.download({
      url: message.url,
      filename: fileName,
    })
    return
  }

  if (message.command === "download-folder-file") {
    let fileName = sanitizeFileName(message.fileName)
    const folderName = sanitizeFileName(message.folderName)
    fileName = `${folderName}_${fileName}`
    if (message.prependCourseToFileName) {
      fileName = `${courseName}_${fileName}`
    }
    if (message.prependCourseShortcutToFileName) {
      fileName = `${courseShortcut}_${fileName}`
    }
    if (message.saveToFolder) {
      fileName = `${courseName}/${fileName}`
    }
    browser.downloads.download({
      url: message.url,
      filename: fileName,
    })
  }
})
