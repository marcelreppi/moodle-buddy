const { parseFileNameFromPluginFileURL } = require("../shared/parser")
const { fileRegex, pluginFileRegex, validURLRegex } = require("../shared/helpers")
const { sendDownloadData, sendLog } = require("./helpers")

let downloadFileCount = 0
let downloadByteCount = 0
const inProgressDownloads = new Set()
let finishedDownloads = []
let cancel = false

browser.downloads.onChanged.addListener(async downloadDelta => {
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
  return fileName.trim().replace(/\\|\/|:|\*|\?|"|<|>|\|/gi, connectingString)
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

    const { courseName, courseShortcut, options } = message

    async function download(url, fileName) {
      if (cancel) return

      // Remove illegal characters from possible filename parts
      const cleanCourseName = sanitizeFileName(courseName, "")
      const cleanCourseShortcut = sanitizeFileName(courseShortcut, "_")
      let cleanFileName = sanitizeFileName(fileName)
      // Apply all options to filename
      if (options.prependCourseToFileName) {
        cleanFileName = `${cleanCourseName}_${cleanFileName}`
      }

      if (options.prependCourseShortcutToFileName) {
        cleanFileName = `${cleanCourseShortcut}_${cleanFileName}`
      }

      if (options.saveToFolder) {
        cleanFileName = `${cleanCourseName}/${cleanFileName}`
      }

      if (process.env.NODE_ENV === "debug") {
        console.log(cleanFileName)
        console.log(url)
        return
      }

      try {
        const id = await browser.downloads.download({ url, filename: cleanFileName })
        inProgressDownloads.add(id)
      } catch (error) {
        sendLog({ errorMessage: error.message, url, fileName: cleanFileName })
      }
    }

    async function downloadPluginFile(node) {
      if (cancel) return

      await download(node.href, node.fileName)
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

      await download(downloadURL, fileName)
    }

    async function downloadFolder(node) {
      if (cancel) return

      // Fetch the href to get the actual download URL
      const res = await fetch(node.href)
      const body = await res.text()
      const parser = new DOMParser()
      const resHTML = parser.parseFromString(body, "text/html")

      const baseURL = res.url.match(validURLRegex)[0]

      // Two options here
      // 1. "Download Folder" button is shown --> Download zip via button
      // 2. "Download Folder" button is hidden --> Download all files separately

      const downloadButtonVisible =
        resHTML.querySelector(`form[action="${baseURL}/mod/folder/download_folder.php"]`) !== null

      if (downloadButtonVisible) {
        const downloadIDTag = resHTML.querySelector("input[name='id']")

        if (downloadIDTag === null) return

        const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadIDTag.getAttribute(
          "value"
        )}`

        const fileName = `${node.folderName}.zip`
        await download(downloadURL, fileName)
      } else {
        const fileNodes = resHTML.querySelectorAll("a[href$='forcedownload=1'") // All a tags whose href attribute ends with forcedownload=1

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

        for (const fileNode of fileNodes) {
          const URLFileName = parseFileNameFromPluginFileURL(fileNode.href)
          const fileName = `${node.folderName}_Folder_${URLFileName}`
          await download(fileNode.href, fileName)
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
