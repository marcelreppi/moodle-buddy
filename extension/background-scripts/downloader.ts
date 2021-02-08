// import DownloadTracker from "extension/models/DownloadTracker"
import { DownloadMessage, DownloadProgressMessage, Message } from "extension/types/messages.types"
import { ExtensionOptions, ExtensionStorage } from "extension/types/global.types"
import { FileResource, FolderResource } from "extension/models/Course.types"
import {
  parseFileNameFromPluginFileURL,
  getDownloadButton,
  getDownloadIdTag,
  getQuerySelector,
} from "../shared/parser"
import { getURLRegex, getMoodleBaseURL } from "../shared/helpers"
import { sanitizeFileName } from "./helpers"
import { sendLog, sendDownloadData } from "./tracker"

let downloadTrackers: Record<number, DownloadTracker> = {}
let cancel = false

class DownloadTracker {
  id: number
  fileCount: number
  byteCount: number
  addCount: number
  removeCount: number
  errorCount: number
  interruptCount: number
  inProgress: Set<number>
  finished: number[]

  constructor() {
    this.id = new Date().getTime() // Use time as ID
    this.fileCount = 0
    this.byteCount = 0
    this.addCount = 0
    this.removeCount = 0
    this.errorCount = 0
    this.interruptCount = 0
    this.inProgress = new Set()
    this.finished = []

    // Register in download trackers
    downloadTrackers[this.id] = this
  }

  async addFiles(n: number): Promise<void> {
    this.addCount += n
    this.fileCount += n

    await this.onUpdate()
  }

  async removeFiles(n: number): Promise<void> {
    this.removeCount += n
    this.fileCount -= n

    await this.onUpdate()
  }

  async onDownloadStart(id: number): Promise<void> {
    this.inProgress.add(id)

    await this.onUpdate()
  }

  async onError(): Promise<void> {
    this.errorCount++
    this.fileCount--

    await this.onUpdate()
  }

  async onInterrupted(id: number): Promise<void> {
    this.interruptCount++
    this.fileCount--
    this.inProgress.delete(id)

    await this.onUpdate()
  }

  async onCompleted(id: number): Promise<void> {
    const downloadItem = await browser.downloads.search({ id })
    this.byteCount += downloadItem[0].fileSize
    this.inProgress.delete(id)
    this.finished.push(id)

    await this.onUpdate()
  }

  async onUpdate(): Promise<void> {
    // Check if view needs to be updated
    // Only update view if the current download is the most recent one
    const isMostRecent = this.id === Math.max(...Object.keys(downloadTrackers).map(parseFloat))
    if (isMostRecent) {
      browser.runtime.sendMessage<DownloadProgressMessage>({
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
      const { totalDownloadedFiles }: ExtensionStorage = await browser.storage.local.get(
        "totalDownloadedFiles"
      )
      await browser.storage.local.set({
        totalDownloadedFiles: totalDownloadedFiles + this.fileCount,
      })
      delete downloadTrackers[this.id]
    }
  }
}

interface DownloadMetaData {
  courseName: string
  courseShortcut: string
  options: ExtensionOptions
}

function onCancel() {
  cancel = true

  for (const tracker of Object.values(downloadTrackers)) {
    for (const id of tracker.inProgress) {
      browser.downloads.cancel(id)
    }
  }
  downloadTrackers = {}
}

async function download(
  href: string,
  fileName: string,
  section: string,
  downloadMetaData: DownloadMetaData,
  downloadTracker: DownloadTracker
) {
  if (cancel) return

  const { courseName, courseShortcut, options } = downloadMetaData

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
    console.log(href)
    // return
  }

  try {
    const id = await browser.downloads.download({ url: href, filename: filePath })
    await downloadTracker.onDownloadStart(id)
  } catch (err) {
    console.error(err)
    sendLog({ errorMessage: err.message, url: href, fileName: filePath })
    await downloadTracker.onError()
  }
}

async function downloadPluginFile(
  resource: FileResource,
  downloadMetaData: DownloadMetaData,
  downloadTracker: DownloadTracker
) {
  if (cancel) return

  let { name: fileName } = resource
  if (resource.partOfFolder) {
    const folderName = sanitizeFileName(resource.partOfFolder)
    fileName = `${folderName}{slash}${fileName}`
  }

  await download(resource.href, fileName, resource.section, downloadMetaData, downloadTracker)
}

async function downloadFile(
  resource: FileResource,
  downloadMetaData: DownloadMetaData,
  downloadTracker: DownloadTracker
) {
  if (cancel) return

  // Fetch the href to get the actual download URL
  const res = await fetch(resource.href)

  let downloadURL = res.url

  // Sometimes (e.g. for images) Moodle returns HTML with the file embedded
  if (res.url.match(getURLRegex("file"))) {
    const body = await res.text()
    const parser = new DOMParser()
    const resHTML = parser.parseFromString(body, "text/html")
    const mainRegionHTML = resHTML.querySelector("#region-main")
    if (mainRegionHTML) {
      const pluginFileURLRegex = getURLRegex("pluginfile")
      const pluginFileURLMatch = mainRegionHTML.innerHTML.match(pluginFileURLRegex)
      if (pluginFileURLMatch) {
        downloadURL = pluginFileURLMatch.shift() || ""
      } else {
        // TODO: Update view on fail
        return
      }
    }
  } else if (res.url.match(getURLRegex("url"))) {
    const body = await res.text()
    const parser = new DOMParser()
    const resHTML = parser.parseFromString(body, "text/html")
    const mainRegionHTML = resHTML.querySelector("#region-main")
    if (mainRegionHTML) {
      const moodleURL = getMoodleBaseURL(res.url)
      const externalATag: HTMLAnchorElement | null = mainRegionHTML.querySelector(
        `a:not([href^="${moodleURL}"])`
      )
      if (externalATag) {
        downloadURL = externalATag.href
      } else {
        return
      }
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

  const { useMoodleFileName } = downloadMetaData.options
  if (useMoodleFileName && resource.name !== "" && fileType !== "") {
    fileName = `${sanitizeFileName(resource.name)}.${fileType}`
  }

  downloadURL = downloadURL.replace(/\"\ onclick.*/gi, "") // Fix trailing %22%20onclick issue

  await download(downloadURL, fileName, resource.section, downloadMetaData, downloadTracker)
}

async function downloadFolder(
  resource: FolderResource,
  downloadMetaData: DownloadMetaData,
  downloadTracker: DownloadTracker
) {
  if (cancel) return

  if (resource.isInline) {
    const fileName = `${sanitizeFileName(resource.name)}.zip`
    await download(resource.href, fileName, resource.section, downloadMetaData, downloadTracker)
    return
  }

  // Fetch the href to get the actual download URL
  const res = await fetch(resource.href)
  const body = await res.text()
  const parser = new DOMParser()
  const resHTML = parser.parseFromString(body, "text/html").body

  const baseURL = getMoodleBaseURL(res.url)

  // Two options here
  // 1. "Download Folder" button is shown --> Download zip via button
  // 2. "Download Folder" button is hidden --> Download all files separately

  const downloadButton = getDownloadButton(resHTML)

  const { downloadFolderAsZip } = downloadMetaData.options
  if (downloadFolderAsZip && downloadButton !== null) {
    const downloadIdTag = getDownloadIdTag(resHTML)

    if (downloadIdTag === null) return
    const downloadId = downloadIdTag.getAttribute("value")
    const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadId}`

    const fileName = `${sanitizeFileName(resource.name)}.zip`
    await download(downloadURL, fileName, resource.section, downloadMetaData, downloadTracker)
  } else {
    // Downloading folder content as individual files
    const fileNodes = resHTML.querySelectorAll<HTMLAnchorElement>(
      getQuerySelector("pluginfile", downloadMetaData.options)
    )
    await downloadTracker.removeFiles(1)

    // Handle empty folders
    if (fileNodes.length === 0) {
      if (process.env.NODE_ENV === "debug") {
        await download(
          "Debugging folder download",
          resource.name,
          resource.section,
          downloadMetaData,
          downloadTracker
        )
      }
      return
    }

    await downloadTracker.addFiles(fileNodes.length)

    const cleanFolderName = sanitizeFileName(resource.name)
    for (const fileNode of Array.from(fileNodes)) {
      const URLFileName = parseFileNameFromPluginFileURL(fileNode.href)
      const fileName = `${cleanFolderName}{slash}${URLFileName}`
      await download(fileNode.href, fileName, resource.section, downloadMetaData, downloadTracker)
    }
  }
}

async function downloadVideoServiceVideo(
  resource: FileResource,
  downloadMetaData: DownloadMetaData,
  downloadTracker: DownloadTracker
) {
  let fileName = parseFileNameFromPluginFileURL(resource.href)
  const fileParts = fileName.split(".")
  let fileType = fileParts.pop()
  while (fileType === "") {
    fileType = fileParts.pop()
    if (fileParts.length === 0) {
      break
    }
  }

  const { useMoodleFileName } = downloadMetaData.options
  if (useMoodleFileName && resource.name !== "" && fileType !== "") {
    fileName = `${sanitizeFileName(resource.name)}.${fileType}`
  }

  await download(resource.href, fileName, resource.section, downloadMetaData, downloadTracker)
}

async function onDownload(message: DownloadMessage) {
  cancel = false

  const { courseName, courseShortcut, resources, options: userOptions } = message
  const { options: storageOptions }: ExtensionStorage = await browser.storage.local.get("options")

  const options = { ...storageOptions, ...userOptions }

  // Create meta data object to share
  const downloadMetaData: DownloadMetaData = {
    courseName,
    courseShortcut,
    options,
  }

  // Create and register the download tracker
  const downloadTracker = new DownloadTracker()
  await downloadTracker.addFiles(resources.length)

  for (const r of resources) {
    if (cancel) return

    switch (r.type) {
      case "file":
        downloadFile(r as FileResource, downloadMetaData, downloadTracker)
        break
      case "url":
        downloadFile(r as FileResource, downloadMetaData, downloadTracker)
        break
      case "pluginfile":
        downloadPluginFile(r as FileResource, downloadMetaData, downloadTracker)
        break
      case "folder":
        downloadFolder(r as FolderResource, downloadMetaData, downloadTracker)
        break
      case "videoservice":
        downloadVideoServiceVideo(r as FileResource, downloadMetaData, downloadTracker)
        break
      default:
        break
    }
  }
}

browser.downloads.onChanged.addListener(async downloadDelta => {
  const { state, id } = downloadDelta

  if (state === undefined) return

  let downloadTracker = null
  for (const tracker of Object.values(downloadTrackers)) {
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

// eslint-disable-next-line @typescript-eslint/ban-types
const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message
  switch (command) {
    case "cancel-download":
      onCancel()
      break
    case "download":
      onDownload(message as DownloadMessage)
      break
    default:
      break
  }
}
browser.runtime.onMessage.addListener(messageListener)
