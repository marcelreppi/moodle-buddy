const {
  parseFileNameFromPluginFileURL,
  getDownloadButton,
  getDownloadIdTag,
  getQuerySelector,
} = require("../shared/parser")
const { fileRegex, getURLRegex, getMoodleBaseURL } = require("../shared/helpers")
const { sendDownloadData, sendLog } = require("./helpers")

let downloadTrackers = {}
let cancel = false

function DownloadTracker() {
  this.startTime = new Date().getTime()
  downloadTrackers[this.startTime] = this

  this.fileCount = 0
  this.byteCount = 0
  this.addCount = 0
  this.removeCount = 0
  this.errorCount = 0
  this.interruptCount = 0
  this.inProgress = new Set()
  this.finished = []
  this.addFiles = async function(n) {
    this.addCount += n
    this.fileCount += n

    await this.onUpdate()
  }
  this.removeFiles = async function(n) {
    this.removeCount += n
    this.fileCount -= n

    await this.onUpdate()
  }
  this.onDownloadStart = async function(id) {
    this.inProgress.add(id)

    await this.onUpdate()
  }
  this.onError = async function() {
    this.errorCount++
    this.fileCount--

    await this.onUpdate()
  }
  this.onInterrupted = async function(id) {
    this.interruptCount++
    this.fileCount--
    this.inProgress.delete(id)

    await this.onUpdate()
  }
  this.onCompleted = async function(id) {
    const downloadItem = await browser.downloads.search({ id })
    this.byteCount += downloadItem[0].fileSize
    this.inProgress.delete(id)
    this.finished.push(id)

    await this.onUpdate()
  }
  this.onUpdate = async function() {
    // Check if view needs to be updated
    // Only update view if the current download is the most recent one
    const isMostRecent = this.startTime === Math.max(...Object.keys(downloadTrackers))
    if (isMostRecent) {
      browser.runtime.sendMessage({
        command: "download-progress",
        completed: this.finished.length,
        total: this.fileCount,
        errors: this.errorCount,
      })
    }

    // Check if all downloads have completed
    if (this.finished.length === this.fileCount) {
      // All downloads have finished
      sendDownloadData({
        fileCount: this.fileCount,
        byteCount: this.byteCount,
        errorCount: this.errorCount,
        interruptCount: this.interruptCount,
        addCount: this.addCount,
        removeCount: this.removeCount,
      })
      const { totalDownloadedFiles } = await browser.storage.local.get("totalDownloadedFiles")
      await browser.storage.local.set({
        totalDownloadedFiles: totalDownloadedFiles + this.fileCount,
      })
      delete downloadTrackers[this.startTime]
    }
  }
}

browser.downloads.onChanged.addListener(async downloadDelta => {
  const { state, id } = downloadDelta

  if (state === undefined) return

  let downloadTracker = null
  for (const [time, tracker] of Object.entries(downloadTrackers)) {
    if (tracker.inProgress.has(id)) {
      downloadTracker = tracker
    }
  }

  if (!downloadTracker) {
    downloadTrackers = {}
    return
  }

  if (state.current === "interrupted") {
    await downloadTracker.onInterrupted(id)
  }

  if (state.current === "complete") {
    await downloadTracker.onCompleted(id)
  }
})

function sanitizeFileName(fileName, connectingString = "") {
  return fileName
    .trim()
    .replace(/\\|\/|:|\*|\?|"|<|>|\|/gi, connectingString) // Remove illegal chars
    .replace(/( )\1+/gi, " ") // Remove > 1 white spaces
    .replace(/^\.*/gi, "") // Remove dots at the start
    .replace(/\.*$/gi, "") // Remove dots at the end
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
    downloadTrackers = {}
  }

  if (message.command === "download") {
    const { courseName, courseShortcut, resources, options: userOptions } = message
    const { options: storageOptions } = await browser.storage.local.get("options")

    cancel = false
    const options = { ...storageOptions, ...userOptions }
    const downloadTracker = new DownloadTracker()
    await downloadTracker.addFiles(resources.length)

    async function download(url, fileName, section = "") {
      if (cancel) return

      // Remove illegal characters from possible filename parts
      const cleanCourseName = sanitizeFileName(courseName, "")
      const cleanCourseShortcut = sanitizeFileName(courseShortcut, "_")
      const cleanSectionName = sanitizeFileName(section)
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
        // return
      }

      try {
        const id = await browser.downloads.download({ url, filename: filePath })
        await downloadTracker.onDownloadStart(id)
      } catch (err) {
        console.error(err)
        sendLog({ errorMessage: err.message, url, fileName: filePath })
        await downloadTracker.onError()
      }
    }

    async function downloadPluginFile(node) {
      if (cancel) return

      let { fileName } = node
      if (node.partOfFolder !== "") {
        const folderName = sanitizeFileName(node.partOfFolder)
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
          const pluginFileURLRegex = getURLRegex("pluginfile")
          downloadURL = mainRegionHTML.innerHTML.match(pluginFileURLRegex).shift()
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
        fileName = `${sanitizeFileName(node.fileName)}.${fileType}`
      }

      await download(downloadURL, fileName, node.section)
    }

    async function downloadFolder(node) {
      if (cancel) return

      if (node.isInline) {
        const fileName = `${sanitizeFileName(node.folderName)}.zip`
        await download(node.href, fileName, node.section)
        return
      }

      // Fetch the href to get the actual download URL
      const res = await fetch(node.href)
      const body = await res.text()
      const parser = new DOMParser()
      const resHTML = parser.parseFromString(body, "text/html")

      const baseURL = getMoodleBaseURL(res.url)

      // Two options here
      // 1. "Download Folder" button is shown --> Download zip via button
      // 2. "Download Folder" button is hidden --> Download all files separately

      const downloadButton = getDownloadButton(resHTML)

      if (options.downloadFolderAsZip && downloadButton !== null) {
        const downloadIdTag = getDownloadIdTag(resHTML)

        if (downloadIdTag === null) return
        const downloadId = downloadIdTag.getAttribute("value")
        const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadId}`

        const fileName = `${sanitizeFileName(node.folderName)}.zip`
        await download(downloadURL, fileName, node.section)
      } else {
        // Downloading folder content as individual files
        const fileNodes = resHTML.querySelectorAll(getQuerySelector("pluginfile", options))
        await downloadTracker.removeFiles(1)

        // Handle empty folders
        if (fileNodes.length === 0) {
          if (process.env.NODE_ENV === "debug") {
            await download("Debugging folder download", node.folderName)
          }
          return
        }

        await downloadTracker.addFiles(fileNodes.length)

        const cleanFolderName = sanitizeFileName(node.folderName)
        for (const fileNode of fileNodes) {
          const URLFileName = parseFileNameFromPluginFileURL(fileNode.href)
          const fileName = `${cleanFolderName}{slash}${URLFileName}`
          await download(fileNode.href, fileName, node.section)
        }
      }
    }

    async function downloadVideoServiceVideo(node) {
      let fileName = parseFileNameFromPluginFileURL(node.href)
      const fileParts = fileName.split(".")
      let fileType = fileParts.pop()
      while (fileType === "") {
        fileType = fileParts.pop()
        if (fileParts.length === 0) {
          break
        }
      }

      if (options.useMoodleFileName && node.fileName !== "" && fileType !== "") {
        fileName = `${sanitizeFileName(node.fileName)}.${fileType}`
      }

      await download(node.href, fileName)
    }

    for (const node of resources) {
      if (cancel) return

      if (node.isPluginFile) {
        downloadPluginFile(node)
      } else if (node.isFile) {
        downloadFile(node)
      } else if (node.isFolder) {
        downloadFolder(node)
      } else if (node.isVideoServiceVideo) {
        downloadVideoServiceVideo(node)
      }
    }
  }
})
