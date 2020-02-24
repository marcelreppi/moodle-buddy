const { parseFileNameFromPluginFileURL } = require("../shared/parser")
const { fileRegex, pluginFileRegex, validURLRegex } = require("../shared/helpers")
const { sendDownloadData, sendLog } = require("./helpers")

let downloadFileCount = 0
let downloadByteCount = 0
let finishedDownloads = []

browser.downloads.onChanged.addListener(async downloadDelta => {
  const { state, id } = downloadDelta

  if (state === undefined) return

  if (state.current === "interrupted") {
    downloadFileCount--
  }

  if (state.current === "complete") {
    const downloadItem = await browser.downloads.search({ id })
    downloadByteCount += downloadItem[0].fileSize
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
  if (message.command === "download") {
    finishedDownloads = []
    downloadFileCount = 0
    downloadByteCount = 0

    const { courseName, courseShortcut, options } = message

    async function download(url, fileName) {
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
        await browser.downloads.download({ url, filename: cleanFileName })
      } catch (error) {
        sendLog({ errorMessage: error.message, url, fileName: cleanFileName })
      }
    }

    async function downloadPluginFile(node) {
      await download(node.href, node.fileName)
    }

    async function downloadFile(node) {
      // Fetch the href to get the actual download URL
      const res = await fetch(node.href)

      // Sometimes (e.g. for images) moodle returns an HTML with the file embedded
      if (res.url.match(fileRegex)) {
        const body = await res.text()
        const parser = new DOMParser()
        const resHTML = parser.parseFromString(body, "text/html")
        const mainRegionHTML = resHTML.querySelector("#region-main").innerHTML
        const link = mainRegionHTML.match(pluginFileRegex)[0]

        const fileName = parseFileNameFromPluginFileURL(link)
        download(link, fileName)
      } else {
        let fileName = parseFileNameFromPluginFileURL(res.url)
        const fileType = fileName.split(".").pop()

        if (options.useMoodleFileName && node.fileName !== "") {
          fileName = `${node.fileName}.${fileType}`
        }

        await download(res.url, fileName)
      }
    }

    async function downloadFolder(node) {
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
