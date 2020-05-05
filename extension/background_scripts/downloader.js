const {
  parseFileNameFromPluginFileURL,
  getDownloadButton,
  getDownloadIdTag,
  getQuerySelector,
} = require("../shared/parser")
const { fileRegex, pluginFileRegex, validURLRegex } = require("../shared/helpers")
const { sendDownloadData, sendLog } = require("./helpers")

function DownloadTracker() {
  this.fileCount = 0
  this.byteCount = 0
  this.inProgress = new Set()
  this.finished = []
}

const downloadTrackers = {}

let cancel = false

browser.downloads.onChanged.addListener(async downloadDelta => {
  const { state, id } = downloadDelta

  if (state === undefined) return

  const mostRecent = Math.max(...Object.keys(downloadTrackers))
  let downloadTracker = null
  let trackerTime = null
  for (const [time, tracker] of Object.entries(downloadTrackers)) {
    if (tracker.inProgress.has(id)) {
      downloadTracker = tracker
      trackerTime = parseFloat(time)
    }
  }
  const isMostRecent = trackerTime === mostRecent

  if (!downloadTracker) {
    sendLog("Download tracker was null")
    return
  }

  if (state.current === "interrupted") {
    downloadTracker.fileCount--
  }

  if (state.current === "complete") {
    const downloadItem = await browser.downloads.search({ id })
    downloadTracker.byteCount += downloadItem[0].fileSize
    downloadTracker.inProgress.delete(id)
    downloadTracker.finished.push(id)
  }

  if (
    downloadTracker.fileCount > 0 &&
    downloadTracker.finished.length === downloadTracker.fileCount
  ) {
    // All downloads have finished
    sendDownloadData({
      fileCount: downloadTracker.fileCount,
      byteCount: downloadTracker.byteCount,
    })
    const { totalDownloadedFiles } = await browser.storage.local.get("totalDownloadedFiles")
    await browser.storage.local.set({
      totalDownloadedFiles: totalDownloadedFiles + downloadTracker.fileCount,
    })
    delete downloadTrackers[trackerTime]
  }

  // Check if view needs to be updated
  // Only update view with most recent tracker information
  if (isMostRecent) {
    browser.runtime.sendMessage({
      command: "download-progress",
      completed: downloadTracker.finished.length,
      total: downloadTracker.fileCount,
    })
  }
})

function sanitizeFileName(fileName, connectingString = "") {
  return fileName
    .trim()
    .replace(/\\|\/|:|\*|\?|"|<|>|\|/gi, connectingString)
    .trim()
}

function sanitizeFolderName(folderName, connectingString = "") {
  return sanitizeFileName(folderName)
    .replace(/\./gi, connectingString)
    .trim()
}

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "cancel-download") {
    cancel = true
    for (const tracker of Object.values(downloadTrackers)) {
      for (const id of tracker.inProgress) {
        browser.downloads.cancel(id)
      }
    }
  }

  if (message.command === "download") {
    const downloadTracker = new DownloadTracker()
    const downloadTime = new Date().getTime()
    downloadTrackers[downloadTime] = downloadTracker
    cancel = false

    const { options: storageOptions } = await browser.storage.local.get("options")

    const { courseName, courseShortcut, options: userOptions } = message

    const options = { ...storageOptions, ...userOptions }

    async function download(url, fileName, section = "") {
      if (cancel) return

      // Remove illegal characters from possible filename parts
      const cleanCourseName = sanitizeFolderName(courseName, "")
      const cleanCourseShortcut = sanitizeFolderName(courseShortcut, "_")
      const cleanSectionName = sanitizeFolderName(section)
      const cleanFileName = sanitizeFileName(fileName).replace("{slash}", "/")

      let filePath = cleanFileName
      // Apply all options to filename
      if (options.prependCourseToFileName) {
        filePath = `${cleanCourseName}_${filePath}`
      }

      if (options.prependCourseShortcutToFileName) {
        filePath = `${cleanCourseShortcut}_${filePath}`
      }

      switch (options.folderStructure) {
        case "CourseFile":
          filePath = `${cleanCourseName}/${filePath}`
          break
        case "CourseSectionFile":
          if (section !== "") {
            filePath = `${cleanCourseName}/${cleanSectionName}/${filePath}`
          } else {
            filePath = `${cleanCourseName}/${filePath}`
          }
          break
        case "None":
          break
        default:
          break
      }

      if (options.saveToMoodleFolder) {
        filePath = `Moodle/${filePath}`
      }

      if (process.env.NODE_ENV === "debug") {
        console.log(filePath)
        console.log(url)
        return
      }

      try {
        const id = await browser.downloads.download({ url, filename: filePath })
        downloadTracker.inProgress.add(id)
      } catch (error) {
        sendLog({ errorMessage: error.message, url, fileName: filePath })
      }
    }

    async function downloadPluginFile(node) {
      if (cancel) return

      let { fileName } = node
      if (node.partOfFolder !== "") {
        const folderName = sanitizeFolderName(node.partOfFolder)
        fileName = `${folderName}{slash}${fileName}`
      }

      await download(node.href, fileName, node.section)
    }

    async function downloadFile(node) {
      if (cancel) return

      // Fetch the href to get the actual download URL
      const res = await fetch(node.href)

      let downloadURL = res.url

      // Sometimes (e.g. for images) Moodle returns HTML with the file embedded
      if (res.url.match(fileRegex)) {
        const body = await res.text()
        const parser = new DOMParser()
        const resHTML = parser.parseFromString(body, "text/html")
        const mainRegionHTML = resHTML.querySelector("#region-main")
        if (mainRegionHTML) {
          downloadURL = mainRegionHTML.innerHTML.match(pluginFileRegex).shift()
        }
      }

      let fileName = parseFileNameFromPluginFileURL(downloadURL)
      const fileParts = fileName.split(".")
      let fileType = fileParts.pop()
      while (fileType === "") {
        fileType = fileParts.pop()
        if (fileParts.length === 0) {
          break
        }
      }

      if (options.useMoodleFileName && node.fileName !== "" && fileType !== "") {
        fileName = `${node.fileName}.${fileType}`
      }

      await download(downloadURL, fileName, node.section)
    }

    async function downloadFolder(node) {
      if (cancel) return

      if (node.isInline) {
        const fileName = `${node.folderName}.zip`
        await download(node.href, fileName, node.section)
        return
      }

      // Fetch the href to get the actual download URL
      const res = await fetch(node.href)
      const body = await res.text()
      const parser = new DOMParser()
      const resHTML = parser.parseFromString(body, "text/html")

      const baseURL = res.url.match(validURLRegex)[0]

      // Two options here
      // 1. "Download Folder" button is shown --> Download zip via button
      // 2. "Download Folder" button is hidden --> Download all files separately

      const downloadButton = getDownloadButton(resHTML)

      if (options.downloadFolderAsZip && downloadButton !== null) {
        const downloadIdTag = getDownloadIdTag(resHTML)

        if (downloadIdTag === null) return
        const downloadId = downloadIdTag.getAttribute("value")
        const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadId}`

        const fileName = `${node.folderName}.zip`
        await download(downloadURL, fileName, node.section)
      } else {
        // Downloading folder content as individual files
        const fileNodes = resHTML.querySelectorAll(getQuerySelector("pluginfile", options))
        downloadTracker.fileCount--

        // Handle empty folders
        if (fileNodes.length === 0) {
          // Check if view needs to be updated
          // Only update view if the current download is the most recent one
          const mostRecent = Math.max(...Object.keys(downloadTrackers))
          if (downloadTime === mostRecent) {
            browser.runtime.sendMessage({
              command: "download-progress",
              completed: downloadTracker.finished.length,
              total: downloadTracker.fileCount,
            })
          }

          if (process.env.NODE_ENV === "debug") {
            await download("Debugging folder download", node.folderName)
          }
          return
        }

        downloadTracker.fileCount += fileNodes.length

        // Check if view needs to be updated
        // Only update view if the current download is the most recent one
        const mostRecent = Math.max(...Object.keys(downloadTrackers))
        if (downloadTime === mostRecent) {
          browser.runtime.sendMessage({
            command: "download-progress",
            completed: downloadTracker.finished.length,
            total: downloadTracker.fileCount,
          })
        }

        const cleanFolderName = sanitizeFolderName(node.folderName)
        for (const fileNode of fileNodes) {
          const URLFileName = parseFileNameFromPluginFileURL(fileNode.href)
          const fileName = `${cleanFolderName}{slash}${URLFileName}`
          await download(fileNode.href, fileName, node.section)
        }
      }
    }

    for (const node of message.resources) {
      if (cancel) return

      downloadTracker.fileCount++
      if (node.isPluginFile) {
        downloadPluginFile(node)
      } else if (node.isFile) {
        downloadFile(node)
      } else if (node.isFolder) {
        downloadFolder(node)
      }
    }
  }
})
