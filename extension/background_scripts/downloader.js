const {
  parseFileNameFromPluginFileURL,
  getDownloadButton,
  getDownloadIdTag,
  getQuerySelector,
} = require("../shared/parser")
const { fileRegex, pluginFileRegex, validURLRegex } = require("../shared/helpers")
const { sendDownloadData, sendLog } = require("./helpers")

let downloadFileCount = 0
let downloadByteCount = 0
const inProgressDownloads = new Set()
let finishedDownloads = []
let cancel = false

browser.downloads.onChanged.addListener(async downloadDelta => {
  console.log(downloadDelta)
  const { state, id } = downloadDelta

  if (state === undefined) return

  if (state.current === "interrupted") {
    downloadFileCount--
  }

  if (state.current === "complete") {
    const downloadItem = await browser.downloads.search({ id })
    downloadByteCount += downloadItem[0].fileSize
    inProgressDownloads.delete(id)
    finishedDownloads.push(id)
  }

  if (downloadFileCount > 0 && finishedDownloads.length === downloadFileCount) {
    // All downloads have finished
    sendDownloadData({
      fileCount: downloadFileCount,
      byteCount: downloadByteCount,
    })
    const { totalDownloadedFiles } = await browser.storage.local.get("totalDownloadedFiles")
    await browser.storage.local.set({
      totalDownloadedFiles: totalDownloadedFiles + downloadFileCount,
    })
  }

  browser.runtime.sendMessage({
    command: "download-progress",
    completed: finishedDownloads.length,
    total: downloadFileCount,
  })
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
    for (const id of inProgressDownloads) {
      browser.downloads.cancel(id)
    }
  }

  if (message.command === "download") {
    inProgressDownloads.clear()
    finishedDownloads = []
    downloadFileCount = 0
    downloadByteCount = 0
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
        inProgressDownloads.add(id)
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
        const mainRegionHTML = resHTML.querySelector("#region-main").innerHTML
        downloadURL = mainRegionHTML.match(pluginFileRegex).shift()
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
        const fileNodes = resHTML.querySelectorAll(getQuerySelector("pluginfile"))

        // Handle empty folders
        if (fileNodes.length === 0) {
          downloadFileCount--
          browser.runtime.sendMessage({
            command: "download-progress",
            completed: finishedDownloads.length,
            total: downloadFileCount,
          })

          if (process.env.NODE_ENV === "debug") {
            await download("Debugging folder download", node.folderName)
          }
          return
        }

        downloadFileCount += fileNodes.length - 1
        browser.runtime.sendMessage({
          command: "download-progress",
          completed: finishedDownloads.length,
          total: downloadFileCount,
        })

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

      downloadFileCount++
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
