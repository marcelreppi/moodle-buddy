const { parseFileNameFromPluginFileURL } = require("../shared/parser")
const { fileRegex, pluginFileRegex, validURLRegex } = require("../shared/helpers")
const { sendDownloadData, sendLog } = require("./helpers")

let downloadFileCount = 0
let downloadByteCount = 0
let finishedDownloads = []

const sanitizeFileName = (fileName, connectingString = "") =>
  fileName.trim().replace(/\\|\/|:|\*|\?|"|<|>|\|/gi, connectingString)

const applyOptionsToFileName = (fileName, courseName, courseShortcut, options) => {
  let updatedFileName = fileName
  if (options.prependCourseToFileName) {
    updatedFileName = `${courseName}_${updatedFileName}`
  }

  if (options.prependCourseShortcutToFileName) {
    updatedFileName = `${courseShortcut}_${updatedFileName}`
  }

  if (options.saveToFolder) {
    updatedFileName = `${courseName}/${updatedFileName}`
  }

  return updatedFileName
}

async function downloadPluginFile(node, downloadFunc) {
  await downloadFunc(node.href, node.fileName)
}

async function downloadFile(node, downloadFunc, options) {
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
    downloadFunc(link, fileName)
  } else {
    let fileName = parseFileNameFromPluginFileURL(res.url)
    const fileType = fileName.split(".").pop()

    if (options.useMoodleFileName && node.fileName !== "") {
      fileName = `${node.fileName}.${fileType}`
    }

    await downloadFunc(res.url, fileName)
  }
}

async function downloadFolder(node, downloadFunc) {
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
    await downloadFunc(downloadURL, fileName)
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
      return
    }

    for (const fileNode of fileNodes) {
      const URLFileName = parseFileNameFromPluginFileURL(fileNode.href)
      const fileName = `${node.folderName}_Folder_${URLFileName}`
      await downloadFunc(fileNode.href, fileName)
    }
  }
}

browser.downloads.onChanged.addListener(async downloadDelta => {
  const { state } = downloadDelta

  if (state === undefined) return

  if (state.current === "interrupted") {
    downloadFileCount--
  }

  if (state.current === "complete") {
    const downloadItem = await browser.downloads.search({ id: downloadDelta.id })
    downloadByteCount += downloadItem[0].fileSize
    finishedDownloads.push(downloadDelta.id)
  }

  if (downloadFileCount > 0 && finishedDownloads.length === downloadFileCount) {
    // All downloads have finished
    sendDownloadData({
      fileCount: downloadFileCount,
      byteCount: downloadByteCount,
    })
  }

  browser.runtime.sendMessage({
    command: "download-progress",
    completed: finishedDownloads.length,
    total: downloadFileCount,
  })
})

function getDownloadFunction(courseName, courseShortcut, options) {
  return async (url, currentFileName) => {
    const fileName = applyOptionsToFileName(
      sanitizeFileName(currentFileName),
      sanitizeFileName(courseName, "_"),
      sanitizeFileName(courseShortcut, "_"),
      options
    )

    try {
      await browser.downloads.download({ url, filename: fileName })
    } catch (error) {
      sendLog({ errorMessage: error.message, url, fileName })
    }
  }
}

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "download") {
    finishedDownloads = []
    downloadFileCount = 0
    downloadByteCount = 0

    const downloadFunc = getDownloadFunction(
      message.courseName,
      message.courseShortcut,
      message.options
    )

    for (const node of message.resources) {
      downloadFileCount++
      if (node.isPluginFile) {
        downloadPluginFile(node, downloadFunc)
      } else if (node.isFile) {
        downloadFile(node, downloadFunc, message.options)
      } else if (node.isFolder) {
        downloadFolder(node, downloadFunc)
      }
    }
  }
})
