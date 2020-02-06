const { parseFileNameFromPluginFileURL } = require("../shared/parser")
const { fileRegex, pluginFileRegex, validURLRegex } = require("../shared/helpers")
const { sendDownloadData } = require("./helpers")

const inProgressDownloads = new Set()
const finishedDownloads = new Set()
let downloadFileCount = 0
let downloadByteCount = 0

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

async function downloadPluginFile(node, courseName, courseShortcut, options) {
  const fileName = applyOptionsToFileName(node.fileName, courseName, courseShortcut, options)
  const downloadItemId = await browser.downloads.download({
    url: node.href,
    filename: fileName,
  })
  inProgressDownloads.add(downloadItemId)
}

async function downloadFile(node, courseName, courseShortcut, options) {
  // Fetch the href to get the actual download URL
  const res = await fetch(node.href)

  // Sometimes (e.g. for images) moodle returns an HTML with the file embedded
  if (res.url.match(fileRegex)) {
    const body = await res.text()
    const parser = new DOMParser()
    const resHTML = parser.parseFromString(body, "text/html")
    const mainRegionHTML = resHTML.querySelector("#region-main").innerHTML
    const link = mainRegionHTML.match(pluginFileRegex)[0]

    let fileName = parseFileNameFromPluginFileURL(link)
    fileName = applyOptionsToFileName(fileName, courseName, courseShortcut, options)
    const downloadItemId = await browser.downloads.download({
      url: link,
      filename: fileName,
    })
    inProgressDownloads.add(downloadItemId)
  } else {
    let fileName = parseFileNameFromPluginFileURL(res.url)
    const fileType = fileName.split(".").pop()

    if (options.useMoodleFileName) {
      let moodleFileName = sanitizeFileName(node.fileName)
      const moodleFileNameParts = moodleFileName.split(".")
      if (moodleFileNameParts.length > 1) {
        moodleFileName = moodleFileNameParts.slice(0, moodleFileNameParts.length - 1).join(".")
      }
      fileName = `${moodleFileName}.${fileType}`
    }

    fileName = applyOptionsToFileName(fileName, courseName, courseShortcut, options)

    const downloadItemId = await browser.downloads.download({
      url: res.url,
      filename: fileName,
    })
    inProgressDownloads.add(downloadItemId)
  }
}

async function downloadFolder(node, courseName, courseShortcut, options) {
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

    const folderName = sanitizeFileName(node.folderName)
    let fileName = `${folderName}.zip`
    fileName = applyOptionsToFileName(fileName, courseName, courseShortcut, options)
    const downloadItemId = await browser.downloads.download({
      url: downloadURL,
      filename: fileName,
    })
    inProgressDownloads.add(downloadItemId)
  } else {
    const fileNodes = resHTML.querySelectorAll("a[href$='forcedownload=1'") // All a tags whose href attribute ends with forcedownload=1
    for (const fileNode of fileNodes) {
      let fileName = sanitizeFileName(parseFileNameFromPluginFileURL(fileNode.href))
      const folderName = sanitizeFileName(node.folderName)
      fileName = `${folderName}_Folder_${fileName}`
      fileName = applyOptionsToFileName(fileName, courseName, courseShortcut, options)
      const downloadItemId = await browser.downloads.download({
        url: fileNode.href,
        filename: fileName,
      })
      inProgressDownloads.add(downloadItemId)
    }
  }
}

browser.downloads.onChanged.addListener(async downloadDelta => {
  const { state } = downloadDelta

  if (state && state.current === "interrupted") {
    inProgressDownloads.delete(downloadDelta.id)
    downloadFileCount--
  }

  if (state && state.current === "complete") {
    const downloadItem = await browser.downloads.search({ id: downloadDelta.id })
    downloadByteCount += downloadItem[0].fileSize
    inProgressDownloads.delete(downloadDelta.id)
    finishedDownloads.add(downloadDelta.id)
  }

  if (downloadFileCount > 0 && finishedDownloads.size === downloadFileCount) {
    sendDownloadData({
      fileCount: downloadFileCount,
      byteCount: downloadByteCount,
    })

    downloadFileCount = 0
    downloadByteCount = 0
    finishedDownloads.clear()
  }
})

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "download") {
    const courseName = sanitizeFileName(message.courseName)
    const courseShortcut = sanitizeFileName(message.courseShortcut, "_")

    inProgressDownloads.clear()
    finishedDownloads.clear()
    downloadFileCount = 0
    downloadByteCount = 0

    for (const node of message.resources) {
      downloadFileCount++
      if (node.isPluginFile) {
        downloadPluginFile(node, courseName, courseShortcut, message.options)
      } else if (node.isFile) {
        downloadFile(node, courseName, courseShortcut, message.options)
      } else if (node.isFolder) {
        downloadFolder(node, courseName, courseShortcut, message.options)
      }
    }
  }
})
