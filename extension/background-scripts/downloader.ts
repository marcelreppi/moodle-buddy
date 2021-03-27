import pLimit from "p-limit"

import { DownloadMessage, DownloadProgressMessage, Message } from "moodle-buddy-types"
import { ExtensionOptions, ExtensionStorage } from "moodle-buddy-types"
import {
  FileResource,
  FolderResource,
  Resource,
  VideoResource,
} from "moodle-buddy-types"
import {
  parseFileNameFromPluginFileURL,
  getDownloadButton,
  getDownloadIdTag,
  getQuerySelector,
} from "../shared/parser"
import { getURLRegex, getMoodleBaseURL } from "../shared/helpers"
import { getFileTypeFromURL, sanitizeFileName } from "./helpers"
import { sendLog, sendDownloadData } from "./tracker"

let downloaders: Record<number, Downloader> = {}

class Downloader {
  id: number
  courseName: string
  courseShortcut: string
  resources: Resource[]
  options: ExtensionOptions

  private sentData: boolean
  private isCancelled: boolean
  private fileCount: number
  private byteCount: number
  private addCount: number
  private removeCount: number
  private errorCount: number
  private interruptCount: number
  private inProgress: Set<number>
  private finished: number[]

  private prepLimit: pLimit.Limit
  private downloadLimit: pLimit.Limit
  private retryInterval: number

  constructor(
    id: number,
    courseName: string,
    courseShortcut: string,
    resources: Resource[],
    options: ExtensionOptions
  ) {
    this.id = id
    this.courseName = courseName
    this.courseShortcut = courseShortcut
    this.resources = resources
    this.options = options

    this.sentData = false
    this.isCancelled = false
    this.fileCount = 0
    this.byteCount = 0
    this.addCount = 0
    this.removeCount = 0
    this.errorCount = 0
    this.interruptCount = 0
    this.inProgress = new Set()
    this.finished = []

    // Concurrent download limiting
    this.prepLimit = pLimit(this.options.maxConcurrentDownloads)
    this.downloadLimit = pLimit(this.options.maxConcurrentDownloads)
    this.retryInterval = 1000

    this.start()
  }

  async cancel() {
    this.isCancelled = true

    for (const id of this.inProgress) {
      await browser.downloads.cancel(id)
    }

    const remainingFiles =
      this.addCount -
      this.removeCount -
      this.interruptCount -
      this.finished.length -
      this.inProgress.size

    this.removeFiles(remainingFiles)
  }

  isDownloading(id: number): boolean {
    return this.inProgress.has(id)
  }

  isDone() {
    return this.finished.length === this.fileCount
  }

  async onCompleted(id: number) {
    const downloadItem = await browser.downloads.search({ id })
    this.byteCount += downloadItem[0].fileSize
    this.inProgress.delete(id)
    this.finished.push(id)

    await this.onUpdate()
  }

  async onInterrupted(id: number) {
    this.interruptCount++
    this.fileCount--
    this.inProgress.delete(id)

    await this.onUpdate()
  }

  updateView() {
    browser.runtime.sendMessage<DownloadProgressMessage>({
      command: "download-progress",
      completed: this.finished.length,
      total: this.fileCount,
      errors: this.errorCount,
    })
  }

  private async onError() {
    this.errorCount++
    this.fileCount--

    await this.onUpdate()
  }

  private async start() {
    this.addFiles(this.resources.length)

    for (const r of this.resources) {
      this.prepLimit(async () => {
        if (this.isCancelled) {
          this.removeFiles(1)
          return
        }

        switch (r.type) {
          case "file":
            await this.downloadFile(r as FileResource)
            break
          case "url":
            await this.downloadFile(r as FileResource)
            break
          case "pluginfile":
            await this.downloadPluginFile(r as FileResource)
            break
          case "folder":
            await this.downloadFolder(r as FolderResource)
            break
          case "videoservice":
            await this.downloadVideoServiceVideo(r as VideoResource)
            break
          default:
            break
        }
      })
    }
  }

  private async addFiles(n: number) {
    this.addCount += n
    this.fileCount += n

    await this.onUpdate()
  }

  private async removeFiles(n: number) {
    this.removeCount += n
    this.fileCount -= n

    await this.onUpdate()
  }

  private async onDownloadStart(id: number) {
    this.inProgress.add(id)

    await this.onUpdate()
  }

  private async onUpdate() {
    // Check if all downloads have completed
    if (this.isDone() && !this.sentData) {
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
      this.sentData = true
    }
  }

  private async download(href: string, fileName: string, section: string) {
    if (this.isCancelled) return

    // Remove illegal characters from possible filename parts
    const cleanCourseName = sanitizeFileName(this.courseName, "") || "Unknown Course"
    const cleanCourseShortcut = sanitizeFileName(this.courseShortcut, "_") || "Unknown Shortcut"
    const cleanSectionName = sanitizeFileName(section) || "Unknown Section"
    const cleanFileName = sanitizeFileName(fileName).replace("{slash}", "/")

    let filePath = cleanFileName
    // Apply all options to filename
    if (this.options.prependCourseToFileName) {
      filePath = `${cleanCourseName}_${filePath}`
    }

    if (this.options.prependCourseShortcutToFileName) {
      filePath = `${cleanCourseShortcut}_${filePath}`
    }

    switch (this.options.folderStructure) {
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

    if (this.options.saveToMoodleFolder) {
      filePath = `Moodle/${filePath}`
    }

    if (process.env.NODE_ENV === "debug") {
      console.log(filePath)
      console.log(href)
      // return
    }

    const startDownload = async () => {
      if (this.isCancelled) {
        return
      }

      if (this.inProgress.size < this.options.maxConcurrentDownloads) {
        try {
          const id = await browser.downloads.download({ url: href, filename: filePath })
          await this.onDownloadStart(id)
        } catch (err) {
          console.error(err)
          sendLog({ errorMessage: err.message, url: href, fileName: filePath })
          await this.onError()
        }
      } else {
        setTimeout(() => {
          this.downloadLimit(startDownload)
        }, this.retryInterval)
      }
    }

    this.downloadLimit(startDownload)
  }

  private async downloadPluginFile(resource: FileResource) {
    if (this.isCancelled) return

    let { name: fileName } = resource
    if (resource.partOfFolder) {
      const folderName = sanitizeFileName(resource.partOfFolder)
      fileName = `${folderName}{slash}${fileName}`
    }

    await this.download(resource.href, fileName, resource.section)
  }

  private async downloadFile(resource: FileResource) {
    if (this.isCancelled) return

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

    const { useMoodleFileName } = this.options
    if (useMoodleFileName && resource.name !== "" && fileType !== "") {
      fileName = `${sanitizeFileName(resource.name)}.${fileType}`
    }

    downloadURL = downloadURL.replace(/\"\ onclick.*/gi, "") // Fix trailing %22%20onclick issue

    await this.download(downloadURL, fileName, resource.section)
  }

  private async downloadFolder(resource: FolderResource) {
    if (this.isCancelled) return

    if (resource.isInline) {
      const fileName = `${sanitizeFileName(resource.name)}.zip`
      await this.download(resource.href, fileName, resource.section)
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

    const { downloadFolderAsZip } = this.options
    if (downloadFolderAsZip && downloadButton !== null) {
      const downloadIdTag = getDownloadIdTag(resHTML)

      if (downloadIdTag === null) return
      const downloadId = downloadIdTag.getAttribute("value")
      const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadId}`

      const fileName = `${sanitizeFileName(resource.name)}.zip`
      await this.download(downloadURL, fileName, resource.section)
    } else {
      // Downloading folder content as individual files
      const fileNodes = resHTML.querySelectorAll<HTMLAnchorElement>(
        getQuerySelector("pluginfile", this.options)
      )
      await this.removeFiles(1)

      // Handle empty folders
      if (fileNodes.length === 0) {
        if (process.env.NODE_ENV === "debug") {
          await this.download("Debugging folder download", resource.name, resource.section)
        }
        return
      }

      await this.addFiles(fileNodes.length)

      const cleanFolderName = sanitizeFileName(resource.name)
      for (const fileNode of Array.from(fileNodes)) {
        const URLFileName = parseFileNameFromPluginFileURL(fileNode.href)
        const fileName = `${cleanFolderName}{slash}${URLFileName}`
        await this.download(fileNode.href, fileName, resource.section)
      }
    }
  }

  private async downloadVideoServiceVideo(resource: VideoResource) {
    if (this.isCancelled) return

    let fileName = parseFileNameFromPluginFileURL(resource.src)

    const { useMoodleFileName } = this.options
    if (useMoodleFileName) {
      const fileType = getFileTypeFromURL(fileName)
      if (fileType !== "" && resource.name !== "") {
        fileName = `${sanitizeFileName(resource.name)}.${fileType}`
      }
    }

    await this.download(resource.src, fileName, resource.section)
  }
}

async function onCancel() {
  for (const downloader of Object.values(downloaders)) {
    await downloader.cancel()
  }
  downloaders = {}
}

async function onDownload(message: DownloadMessage) {
  const { courseName, courseShortcut, resources, options: userOptions } = message
  const { options: storageOptions }: ExtensionStorage = await browser.storage.local.get("options")

  const options = { ...storageOptions, ...userOptions }

  // Create and register the downloader
  const id = new Date().getTime() // Use time as ID
  const downloader = new Downloader(id, courseName, courseShortcut, resources, options)
  downloaders[downloader.id] = downloader
}

browser.downloads.onChanged.addListener(async (downloadDelta) => {
  const { state, id } = downloadDelta

  if (state === undefined) return

  // Find the downloader to which the download belongs to
  let downloader = null
  for (const d of Object.values(downloaders)) {
    if (d.isDownloading(id)) {
      downloader = d
    }
  }

  if (!downloader) {
    // Not found => Reset the downloaders
    downloaders = {}
    return
  }

  if (state.current === "interrupted") {
    await downloader.onInterrupted(id)
  }

  if (state.current === "complete") {
    await downloader.onCompleted(id)
  }

  // Check if view needs to be updated
  // Only update view if the current download is the most recent one
  const isMostRecent = downloader.id === Math.max(...Object.keys(downloaders).map(parseFloat))
  if (isMostRecent) {
    downloader.updateView()
  }

  if (downloader.isDone()) {
    delete downloaders[downloader.id]
  }
})

// eslint-disable-next-line @typescript-eslint/ban-types
const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message
  switch (command) {
    case "cancel-download":
      await onCancel()
      break
    case "download":
      await onDownload(message as DownloadMessage)
      break
    default:
      break
  }
}
browser.runtime.onMessage.addListener(messageListener)
