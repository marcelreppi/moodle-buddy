import {
  ExtensionOptions,
  ExtensionStorage,
  Resource,
  Activity,
  FileResource,
  FolderResource,
} from "types"
import * as parser from "@shared/parser"
import { getMoodleBaseURL, getURLRegex } from "@shared/regexHelpers"
import logger from "@shared/logger"

async function getLastModifiedHeader(href: string, options: ExtensionOptions) {
  if (!options.detectFileUpdates) return

  const headResponse = await fetch(href, {
    method: "HEAD",
  })
  const lastModified = headResponse.headers.get("last-modified")
  return lastModified ?? undefined
}

const courseURLRegex = getURLRegex("course")

class MoodlePage {
  link: string
  HTMLDocument: Document
  mainHTML: HTMLElement | null
  name: string
  shortcut: string
  title: string
  isFirstScan: boolean
  isCoursePage: boolean
  options: ExtensionOptions

  resources: Resource[]
  activities: Activity[]
  sectionIndices: Record<string, number>

  constructor(link: string, HTMLDocument: Document, options: ExtensionOptions) {
    this.link = link
    this.HTMLDocument = HTMLDocument
    this.mainHTML = HTMLDocument.querySelector<HTMLElement>("#region-main")
    this.options = options
    this.name = this.parseCourseName(HTMLDocument, options)
    this.shortcut = this.parseCourseShortcut(HTMLDocument, options)
    this.title = this.parsePageTitle(HTMLDocument, options)
    this.isFirstScan = true
    this.isCoursePage = !!link.match(courseURLRegex)

    this.resources = []
    this.activities = []
    this.sectionIndices = {}
  }

  protected parsePageTitle(HTMLDocument: Document, options: ExtensionOptions): string {
    return parser.parsePageTitle(HTMLDocument, options)
  }

  protected parseCourseName(HTMLDocument: Document, options: ExtensionOptions): string {
    return parser.parseCourseNameFromCoursePage(HTMLDocument, options)
  }

  protected parseCourseShortcut(HTMLDocument: Document, options: ExtensionOptions): string {
    return parser.parseCourseShortcut(HTMLDocument, options)
  }

  private getSectionIndex(section: string): number {
    if (this.sectionIndices[section] === undefined) {
      this.sectionIndices[section] = Object.keys(this.sectionIndices).length
    }

    return this.sectionIndices[section] + 1
  }

  protected addResource(resource: Resource): void {
    this.resources.push(resource)
  }

  private async addFile(node: HTMLElement) {
    const href = parser.parseURLFromNode(node, "file", this.options)
    if (href === "") return

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FileResource = {
      href,
      name: parser.parseFileNameFromNode(node),
      section,
      type: "file",
      isNew: false,
      isUpdated: false,
      resourceIndex: this.resources.length + 1,
      sectionIndex,
      lastModified: await getLastModifiedHeader(href, this.options),
    }

    this.addResource(resource)
  }

  private async addPluginFile(node: HTMLElement, partOfFolder = "") {
    let href = parser.parseURLFromNode(node, "pluginfile", this.options)
    if (href === "") return

    // Avoid duplicates
    const detectedURLs = this.resources.map((r) => r.href)
    if (detectedURLs.includes(href)) return

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FileResource = {
      href,
      name: parser.parseFileNameFromPluginFileURL(href),
      section,
      type: "pluginfile",
      partOfFolder,
      isNew: false,
      isUpdated: false,
      resourceIndex: this.resources.length + 1,
      sectionIndex,
      lastModified: await getLastModifiedHeader(href, this.options),
    }

    this.addResource(resource)
  }

  private async addURLNode(node: HTMLElement) {
    // Make sure URL is a downloadable file
    const activityIcon: HTMLImageElement | null = node.querySelector("img.activityicon")
    if (activityIcon) {
      const imgName = activityIcon.src.split("/").pop()
      if (imgName) {
        // "icon" image is usually used for websites but I can't download full websites
        // Only support external URLs when they point to a file
        const isFile = imgName !== "icon"
        if (isFile) {
          // File has been identified as downloadable
          const href = parser.parseURLFromNode(node, "url", this.options)
          if (href === "") return

          const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
          const sectionIndex = this.getSectionIndex(section)
          const resourceNode: FileResource = {
            href,
            name: parser.parseFileNameFromNode(node),
            section,
            type: "url",
            isNew: false,
            isUpdated: false,
            resourceIndex: this.resources.length + 1,
            sectionIndex,
            lastModified: await getLastModifiedHeader(href, this.options),
          }

          this.addResource(resourceNode)
        }
      }
    }
  }

  private async addFolder(node: HTMLElement) {
    const href = parser.parseURLFromNode(node, "folder", this.options)

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FolderResource = {
      href,
      name: parser.parseFileNameFromNode(node),
      section,
      type: "folder",
      isInline: false,
      isNew: false,
      isUpdated: false,
      resourceIndex: this.resources.length + 1,
      sectionIndex,
    }

    if (resource.href === "") {
      // Folder could be displayed inline
      const downloadButtonVisible = parser.getDownloadButton(node) !== null
      const { downloadFolderAsZip } = this.options

      if (downloadFolderAsZip && downloadButtonVisible) {
        const downloadIdTag = parser.getDownloadIdTag(node)
        if (downloadIdTag === null) return

        const baseURL = getMoodleBaseURL(this.link)
        const downloadId = downloadIdTag.getAttribute("value")
        const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadId}`

        resource.href = downloadURL
        resource.isInline = true
      } else {
        // Not downloading via button as ZIP
        // Download folder as individual pluginfiles
        // Look for any pluginfiles
        const folderFiles = node.querySelectorAll<HTMLElement>(
          parser.getQuerySelector("pluginfile", this.options)
        )
        for (const pluginFile of Array.from(folderFiles)) {
          await this.addPluginFile(pluginFile, resource.name)
        }
        return
      }
    }

    if (resource.href !== "") {
      resource.lastModified = await getLastModifiedHeader(resource.href, this.options)
    }

    this.addResource(resource)
  }

  private async addActivityNode(node: HTMLElement) {
    if (!this.isCoursePage) {
      return
    }

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const href = parser.parseURLFromNode(node, "activity", this.options)
    if (href === "") return

    const activity: Activity = {
      href,
      name: parser.parseActivityNameFromNode(node),
      section: parser.parseSectionName(node, this.HTMLDocument, this.options),
      isNew: false,
      isUpdated: false,
      type: "activity",
      activityType: parser.parseActivityTypeFromNode(node),
      resourceIndex: this.activities.length + 1,
      sectionIndex,
    }

    this.addActivity(activity)
  }

  protected addActivity(activity: Activity) {
    this.activities.push(activity)
  }

  protected async detectResourcesAndActivities(localStorage: ExtensionStorage): Promise<void> {
    this.resources = []
    this.activities = []
    this.sectionIndices = {}

    const { options } = localStorage

    this.options = options

    if (!this.mainHTML) {
      return
    }

    const modules = this.mainHTML.querySelectorAll<HTMLElement>("li[id^='module-']")
    if (modules && modules.length !== 0) {
      for (const node of Array.from(modules)) {
        const isFile = node.classList.contains("resource")
        const isFolder = node.classList.contains("folder")
        const isURL = node.classList.contains("url")

        if (isFile) {
          await this.addFile(node)
        } else if (isFolder) {
          await this.addFolder(node)
        } else if (isURL) {
          await this.addURLNode(node)
        } else {
          await this.addActivityNode(node)
        }
      }

      // Check for pluginfiles that could be anywhere on the page
      const pluginFileNodes = Array.from(
        this.mainHTML.querySelectorAll<HTMLElement>(
          parser.getQuerySelector("pluginfile", this.options)
        )
      )
      const mediaFileNodes = Array.from(
        this.mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("media", this.options))
      )
      await Promise.all(pluginFileNodes.map((n) => this.addPluginFile(n)))
      await Promise.all(mediaFileNodes.map((n) => this.addPluginFile(n)))
    } else {
      // Backup solution that is a little more brute force
      const fileNodes = Array.from(
        this.mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("file", this.options))
      )
      const pluginFileNodes = Array.from(
        this.mainHTML.querySelectorAll<HTMLElement>(
          parser.getQuerySelector("pluginfile", this.options)
        )
      )
      const urlFileNodes = Array.from(
        this.mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("url", this.options))
      )
      const mediaFileNodes = Array.from(
        this.mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("media", this.options))
      )
      const folderNodes = Array.from(
        this.mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("folder", this.options))
      )
      const activities = Array.from(
        this.mainHTML.querySelectorAll<HTMLElement>(
          parser.getQuerySelector("activity", this.options)
        )
      )

      await Promise.all(fileNodes.map((n) => this.addFile(n)))
      await Promise.all(pluginFileNodes.map((n) => this.addPluginFile(n)))
      await Promise.all(urlFileNodes.map((n) => this.addURLNode(n)))
      await Promise.all(mediaFileNodes.map((n) => this.addPluginFile(n)))
      await Promise.all(folderNodes.map((n) => this.addFolder(n)))
      await Promise.all(activities.map((n) => this.addActivityNode(n)))
    }

    logger.debug("Resource and activity detection finished", { course: this })
  }

  async scan(testLocalStorage?: ExtensionStorage): Promise<void> {
    const localStorage =
      testLocalStorage ?? ((await chrome.storage.local.get()) as ExtensionStorage)

    await this.detectResourcesAndActivities(localStorage)
  }
}

export default MoodlePage
