import pLimit, { LimitFunction } from "p-limit"
import { parseHTML } from "linkedom"

import {
  DownloadMessage,
  DownloadProgressMessage,
  Message,
  AssignmentResource,
  ExtensionOptions,
  ExtensionStorage,
  FileResource,
  FolderResource,
  Resource,
  VideoServiceResource,
} from "types"
import { isDebug } from "@shared/helpers"

import {
  parseFileNameFromPluginFileURL,
  parseAssignmentNameFromPage,
  getDownloadButton,
  getDownloadIdTag,
  getQuerySelector,
} from "@shared/parser"
import { getURLRegex, getMoodleBaseURL } from "@shared/regexHelpers"
import { getFileTypeFromURL, sanitizeFileName, padNumber, sendRuntimeMessageSafely } from "./helpers"
import { sendLog, sendDownloadData } from "./tracker"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

let downloaders: Record<number, Downloader> = {}

const ASSIGNMENT_SELECTORS = {
  intro:
    "#intro, .box.generalbox.mod_introbox, .activity-description, [data-region='activity-description']",
  overview: ".activity-information, [data-region='activity-information']",
  submission:
    "[data-region='assign-submission-status-table'], .submissionstatustable, .assignsubmissionsummary, [data-region='assign-submission-plugin-summary']",
  feedback:
    "[data-region='assign-feedback-status-table'], .feedbacktable, .assignfeedbacksummary, [data-region='assign-feedback-plugin-summary']",
} as const

function getTextContent(node: Element | null, selectorsToStrip: string[] = []): string {
  if (!node) return ""
  const clone = node.cloneNode(true) as Element
  for (const sel of ["script", "style", ".hiddenifjs", ...selectorsToStrip]) {
    clone.querySelectorAll(sel).forEach((el) => el.remove())
  }
  const walk = (n: ChildNode): string => {
    if (n.nodeType === 3) return n.textContent ?? ""
    if (n.nodeType !== 1) return ""
    const tag = (n as Element).tagName?.toLowerCase()
    if (tag === "br") return "\n"
    let t = ""
    for (const c of Array.from(n.childNodes)) t += walk(c)
    if (["p", "div", "li", "tr", "table", "ul", "ol"].includes(tag)) t += "\n"
    return t
  }
  return walk(clone).replace(/\n{2,}/g, "\n").trim()
}

const STRIP_FROM_TABLE_CELLS = [
  // Hidden content (templates, collapsed sections)
  "[style*='display:none']",
  "[style*='display: none']",
  // Interactive / decorative elements
  "button",
  "noscript",
  "select",
  "input",
  "textarea",
  "form",
  "label",
  "[aria-hidden='true']",
  "[role='img']",
  "[role='button']",
  "a[href='#']",
]

function getTableRows(root: Element): string[] {
  const lines: string[] = []
  const seen = new Set<string>()
  for (const tr of Array.from(root.querySelectorAll("tr"))) {
    const cells = Array.from(tr.querySelectorAll("th, td"))
    if (cells.length < 2) continue
    const labelCell = tr.querySelector("th") ?? cells[0]
    const label = (labelCell.textContent ?? "").replace(/\s+/g, " ").trim().replace(/:+$/, "")
    const value = cells
      .filter((c) => c !== labelCell)
      .map((c) =>
        getTextContent(c as Element, STRIP_FROM_TABLE_CELLS)
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter((v) => v && /\p{L}|\p{N}/u.test(v))
      .join(" ")
    const line = `${label}: ${value}`
    if (label && value && !seen.has(line)) {
      seen.add(line)
      lines.push(line)
    }
  }
  return lines
}

function buildAssignmentSummary(mainRegion: Element): string {
  const parts: string[] = []

  const desc = getTextContent(
    mainRegion.querySelector(ASSIGNMENT_SELECTORS.intro),
    ["[id^='assign_files_tree']", ".fileuploadsubmission", ".fileuploadsubmissiontime", ".ygtvitem", ".ygtvchildren", ".ygtvtable"]
  )
  if (desc) parts.push(desc)

  for (const selector of [ASSIGNMENT_SELECTORS.overview, ASSIGNMENT_SELECTORS.submission, ASSIGNMENT_SELECTORS.feedback]) {
    const rows = Array.from(mainRegion.querySelectorAll(selector)).flatMap(getTableRows)
    if (rows.length > 0) parts.push(rows.join("\n"))
  }

  return parts.join("\n\n")
}

class Downloader {
  id: string
  courseLink: string
  courseName: string
  courseShortcut: string
  resources: Resource[]
  options: ExtensionOptions

  private createdAt: number
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

  private prepLimit: LimitFunction
  private downloadLimit: LimitFunction
  private retryInterval: number

  constructor(
    id: string,
    courseLink: string,
    courseName: string,
    courseShortcut: string,
    resources: Resource[],
    options: ExtensionOptions
  ) {
    this.id = id
    this.courseLink = courseLink
    this.courseName = courseName
    this.courseShortcut = courseShortcut
    this.resources = resources
    this.options = options

    this.createdAt = Date.now()
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
      await chrome.downloads.cancel(id)
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

  isMostRecent() {
    return this.createdAt === Math.max(...Object.values(downloaders).map((d) => d.createdAt))
  }

  async onCompleted(id: number) {
    const downloadItem = await chrome.downloads.search({ id })
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
          case "assignment":
            await this.downloadAssignment(r as AssignmentResource)
            break
          case "videoservice":
            await this.downloadVideoServiceVideo(r as VideoServiceResource)
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
      const { totalDownloadedFiles } = (await chrome.storage.local.get(
        "totalDownloadedFiles"
      )) as ExtensionStorage
      await chrome.storage.local.set({
        totalDownloadedFiles: totalDownloadedFiles + this.fileCount,
      } satisfies Partial<ExtensionStorage>)
      this.sentData = true
    }

    await sendRuntimeMessageSafely({
      command: COMMANDS.DOWNLOAD_PROGRESS,
      id: this.id,
      courseLink: this.courseLink,
      courseName: this.courseName,
      completed: this.finished.length,
      total: this.fileCount,
      errors: this.errorCount,
      isDone: this.isDone(),
    } satisfies DownloadProgressMessage)
  }

  private async download(
    href: string,
    fileName: string,
    resource: FileResource | FolderResource | AssignmentResource
  ) {
    if (this.isCancelled) return

    const { lastModified, resourceIndex, section, sectionIndex } = resource

    // Remove illegal characters from possible filename parts
    const cleanCourseShortcut = sanitizeFileName(this.courseShortcut, "_") || "Unknown Shortcut"
    const cleanCourseName = sanitizeFileName(this.courseName, "") || "Unknown Course"
    const cleanSectionName = sanitizeFileName(section)
    const cleanFileName = sanitizeFileName(fileName).replace(/\{slash\}/g, "/")

    let filePath = cleanFileName

    if (
      this.options.detectFileUpdates &&
      this.options.prependLastModifiedToFileName &&
      lastModified !== undefined
    ) {
      const date = new Date(Date.parse(lastModified))
      const dateString = [
        date.getFullYear(),
        padNumber(date.getMonth() + 1, 2),
        padNumber(date.getDate(), 2),
      ].join("-")
      const timeString = [
        padNumber(date.getHours(), 2),
        padNumber(date.getMinutes(), 2),
        padNumber(date.getSeconds(), 2),
      ].join("-")
      filePath = `${dateString}_${timeString}_${filePath}`
    }

    // Apply all options to filename
    if (this.options.prependFileIndexToFileName) {
      filePath = `${padNumber(resourceIndex, 3)}_${filePath}`
    }

    if (this.options.prependSectionToFileName && cleanSectionName !== "") {
      filePath = `${cleanSectionName}_${filePath}`
    }

    if (this.options.prependSectionIndexToFileName && cleanSectionName !== "") {
      filePath = `${padNumber(sectionIndex, 3)}_${filePath}`
    }

    if (this.options.prependCourseNameToFileName) {
      filePath = `${cleanCourseName}_${filePath}`
    }

    if (this.options.prependCourseShortcutToFileName) {
      filePath = `${cleanCourseShortcut}_${filePath}`
    }

    switch (this.options.folderStructure) {
      case "CourseFile":
        if (cleanCourseName !== "") {
          filePath = `${cleanCourseName}/${filePath}`
        }

        break
      case "CourseSectionFile":
        if (cleanCourseName !== "") {
          if (cleanSectionName !== "") {
            filePath = `${cleanCourseName}/${cleanSectionName}/${filePath}`
          } else {
            filePath = `${cleanCourseName}/${filePath}`
          }
        }
        break
      default:
        break
    }

    if (this.options.saveToMoodleFolder) {
      filePath = `Moodle/${filePath}`
    }

    // logger.debug(filePath)
    // logger.debug(href)
    if (isDebug) {
      // return
    }

    const startDownload = async () => {
      if (this.isCancelled) {
        return
      }

      if (this.inProgress.size < this.options.maxConcurrentDownloads) {
        try {
          const id = await chrome.downloads.download({ url: href, filename: filePath })
          logger.debug(`Started download with id ${id} ${filePath}`)
          await this.onDownloadStart(id)
        } catch (err) {
          logger.error(err)
          sendLog({
            errorMessage: err.message,
            url: href,
            fileName: `raw=${fileName} | clean=${cleanFileName} | path=${filePath}`,
          })
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

    const { href, partOfFolder } = resource
    let { name: fileName } = resource
    if (partOfFolder) {
      const folderName = sanitizeFileName(partOfFolder)
      fileName = `${folderName}{slash}${fileName}`
    }

    await this.download(href, fileName, resource)
  }

  private async downloadFile(resource: FileResource) {
    if (this.isCancelled) return

    // Fetch the href to get the actual download URL
    const res = await fetch(resource.href)

    let downloadURL = res.url

    // Sometimes (e.g. for images) Moodle returns HTML with the file embedded
    if (res.url.match(getURLRegex("file")) || res.url.match(getURLRegex("url"))) {
      const body = await res.text()
      const { document } = parseHTML(body)
      const mainRegionHTML = document.querySelector("#region-main")
      if (mainRegionHTML) {
        // There are multiple possibilities how files could be displayed

        // Pluginfiles
        const pluginFileURLRegex = getURLRegex("pluginfile")
        const pluginFileURLMatch = mainRegionHTML.innerHTML.match(pluginFileURLRegex)

        // Audio element
        const audioQuerySelector = getQuerySelector("audio", this.options)
        const audioSrcElement = mainRegionHTML.querySelector(audioQuerySelector)

        // Video element
        const videoQuerySelector = getQuerySelector("video", this.options)
        const videoSrcElement = mainRegionHTML.querySelector(videoQuerySelector)

        // External link
        const moodleURL = getMoodleBaseURL(res.url)
        const externalATag: HTMLAnchorElement | null = mainRegionHTML.querySelector(
          `a:not([href^="${moodleURL}"])`
        )

        if (pluginFileURLMatch) {
          downloadURL = pluginFileURLMatch.shift() || ""
        } else if (audioSrcElement) {
          downloadURL = (audioSrcElement as HTMLSourceElement).src
        } else if (videoSrcElement) {
          downloadURL = (videoSrcElement as HTMLSourceElement).src
        } else if (externalATag) {
          downloadURL = externalATag.href
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

    await this.download(downloadURL, fileName, resource)
  }

  private async downloadFolder(resource: FolderResource) {
    if (this.isCancelled) return

    const { name, href, isInline } = resource

    if (isInline) {
      const fileName = `${sanitizeFileName(name)}.zip`
      await this.download(href, fileName, resource)
      return
    }

    // Fetch the href to get the actual download URL
    const res = await fetch(href)
    const body = await res.text()
    const { document } = parseHTML(body)

    const baseURL = getMoodleBaseURL(res.url)

    // Two options here
    // 1. "Download Folder" button is shown --> Download zip via button
    // 2. "Download Folder" button is hidden --> Download all files separately

    const downloadButton = getDownloadButton(document.body)

    const { downloadFolderAsZip } = this.options
    if (downloadFolderAsZip && downloadButton !== null) {
      const downloadIdTag = getDownloadIdTag(document.body)

      if (downloadIdTag === null) return
      const downloadId = downloadIdTag.getAttribute("value")
      const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadId}`

      const fileName = `${sanitizeFileName(name)}.zip`
      await this.download(downloadURL, fileName, resource)
    } else {
      // Downloading folder content as individual files
      const fileNodes = document.querySelectorAll<HTMLAnchorElement>(
        getQuerySelector("pluginfile", this.options)
      )
      await this.removeFiles(1)

      // Handle empty folders
      if (fileNodes.length === 0) {
        if (isDebug) {
          await this.download("Debugging folder download", name, resource)
        }
        return
      }

      await this.addFiles(fileNodes.length)

      const cleanFolderName = sanitizeFileName(name)
      for (const fileNode of Array.from(fileNodes)) {
        const URLFileName = parseFileNameFromPluginFileURL(fileNode.href)
        const fileName = `${cleanFolderName}{slash}${URLFileName}`
        await this.download(fileNode.href, fileName, resource)
      }
    }
  }

  private async downloadVideoServiceVideo(resource: VideoServiceResource) {
    if (this.isCancelled) return

    const { name, src } = resource

    let fileName = parseFileNameFromPluginFileURL(src)

    const { useMoodleFileName } = this.options
    if (useMoodleFileName) {
      const fileType = getFileTypeFromURL(fileName)
      if (fileType !== "" && name !== "") {
        fileName = `${sanitizeFileName(name)}.${fileType}`
      }
    }

    await this.download(src, fileName, resource)
  }

  private async downloadAssignment(resource: AssignmentResource) {
    if (this.isCancelled) return

    const res = await fetch(resource.href)
    const body = await res.text()
    const { document } = parseHTML(body)
    const mainRegion = document.querySelector("#region-main")

    await this.removeFiles(1)
    if (!mainRegion) return

    const assignmentName = parseAssignmentNameFromPage(document) || resource.name
    const activityId = resource.href.match(/[?&]id=(\d+)/i)?.[1] ?? ""
    const folderName =
      sanitizeFileName(assignmentName) || (activityId ? `assignment-${activityId}` : "assignment")

    const items: Array<{ href?: string; fileName: string; content?: string }> = []
    items.push({
      fileName: `${folderName}{slash}assignment-summary.txt`,
      content: buildAssignmentSummary(mainRegion),
    })

    const introNode = mainRegion.querySelector(ASSIGNMENT_SELECTORS.intro)
    const seenHrefs = new Set<string>()
    for (const anchor of Array.from(
      mainRegion.querySelectorAll<HTMLAnchorElement>(getQuerySelector("pluginfile", this.options))
    )) {
      if (seenHrefs.has(anchor.href)) continue
      seenHrefs.add(anchor.href)

      const isIntro = introNode?.contains(anchor) || anchor.href.includes("/mod_assign/introattachment/")
      if (!isIntro && !this.options.includeAssignmentSubmissionFiles) continue

      const displayName = (anchor.textContent ?? "")
        .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "")
        .replace(/\s+/g, " ")
        .trim()
      const fileName =
        this.options.useMoodleFileName && displayName
          ? displayName
          : parseFileNameFromPluginFileURL(anchor.href)

      items.push({ href: anchor.href, fileName: `${folderName}{slash}${fileName}` })
    }

    await this.addFiles(items.length)
    for (const item of items) {
      if (item.content !== undefined) {
        await this.download(
          `data:text/plain;charset=utf-8,${encodeURIComponent(item.content)}`,
          item.fileName,
          resource
        )
      } else if (item.href) {
        await this.download(item.href, item.fileName, resource)
      }
    }
  }
}

async function onCancel() {
  for (const downloader of Object.values(downloaders)) {
    await downloader.cancel()
  }
  downloaders = {}
}

async function onDownload(message: DownloadMessage) {
  const { id, courseLink, courseName, courseShortcut, resources, options: userOptions } = message
  logger.debug(`Received download message with id ${id}`)

  if (downloaders[id]) {
    logger.debug(`Download with id ${id} already exists`)
    return
  }

  const { options: storageOptions } = (await chrome.storage.local.get(
    "options"
  )) as ExtensionStorage
  const options = { ...storageOptions, ...userOptions }

  // Create and register the downloader
  const downloader = new Downloader(id, courseLink, courseName, courseShortcut, resources, options)
  downloaders[downloader.id] = downloader
}

chrome.downloads.onChanged.addListener(async (downloadDelta) => {
  const { state, id } = downloadDelta

  if (state === undefined) return

  // Find the downloader to which the download belongs to
  let downloader: Downloader | undefined
  for (const d of Object.values(downloaders)) {
    if (d.isDownloading(id)) {
      logger.debug(`Found downloader with id ${d.id}`)
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

  if (downloader.isDone()) {
    delete downloaders[downloader.id]
  }
})

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message
  switch (command) {
    case COMMANDS.CANCEL_DOWNLOAD:
      await onCancel()
      break
    case COMMANDS.DOWNLOAD:
      await onDownload(message as DownloadMessage)
      break
    default:
      break
  }
})
