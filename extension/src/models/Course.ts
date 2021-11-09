import {
  ExtensionOptions,
  ExtensionStorage,
  Resource,
  Activity,
  FileResource,
  FolderResource,
  CourseData,
} from "types"
import * as parser from "../shared/parser"
import { getMoodleBaseURL } from "../shared/regexHelpers"

async function getLastModifiedHeader(href: string) {
  const headResponse = await fetch(href, {
    method: "HEAD",
  })
  const lastModified = headResponse.headers.get("last-modified")
  return lastModified ?? undefined
}

class Course {
  link: string
  HTMLDocument: Document
  name: string
  shortcut: string
  isFirstScan: boolean

  resources: Resource[]
  previousSeenResources: string[] | null

  activities: Activity[]
  previousSeenActivities: string[] | null

  lastModifiedHeaders: Record<string, string | undefined> | undefined

  sectionIndices: Record<string, number>

  constructor(link: string, HTMLDocument: Document) {
    this.link = link
    this.HTMLDocument = HTMLDocument
    this.name = parser.parseCourseNameFromCoursePage(HTMLDocument)
    this.shortcut = parser.parseCourseShortcut(HTMLDocument)
    this.isFirstScan = true

    this.reset()
  }

  private reset(): void {
    this.resources = []
    this.previousSeenResources = null

    this.activities = []
    this.previousSeenActivities = null

    this.sectionIndices = {}
  }

  private getSectionIndex(section: string): number {
    if (this.sectionIndices[section] === undefined) {
      this.sectionIndices[section] = Object.keys(this.sectionIndices).length
    }

    return this.sectionIndices[section] + 1
  }

  private addResource(resource: Resource): void {
    if (this.previousSeenResources !== null) {
      const hasNotBeenSeenBefore = !this.previousSeenResources.includes(resource.href)
      if (hasNotBeenSeenBefore) {
        resource.isNew = true
      }

      const hasBeenUpdated =
        (this.lastModifiedHeaders ?? {})[resource.href] !== resource.lastModified
      if (!resource.isNew && hasBeenUpdated) {
        resource.isUpdated = true
      }
    } else {
      // If course has never been scanned previousSeenResources don't exist
      // Never treat a resource as new when the course is scanned for the first time
      // because we're capturing the initial state of the course
      resource.isNew = false
      resource.isUpdated = false
    }

    this.resources.push(resource)
  }

  private async addFile(node: HTMLElement, options: ExtensionOptions) {
    const href = parser.parseURLFromNode(node, "file", options)
    if (href === "") return

    const section = parser.parseSectionName(node, this.HTMLDocument)
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
      lastModified: await getLastModifiedHeader(href),
    }

    this.addResource(resource)
  }

  private async addPluginFile(node: HTMLElement, options: ExtensionOptions, partOfFolder = "") {
    const href = parser.parseURLFromNode(node, "pluginfile", options)
    if (href === "") return

    // Avoid duplicates
    const detectedURLs = this.resources.map((r) => r.href)
    if (detectedURLs.includes(href)) return

    const section = parser.parseSectionName(node, this.HTMLDocument)
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
      lastModified: await getLastModifiedHeader(href),
    }

    this.addResource(resource)
  }

  private async addURLNode(node: HTMLElement, options: ExtensionOptions) {
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
          const href = parser.parseURLFromNode(node, "url", options)
          if (href === "") return

          const section = parser.parseSectionName(node, this.HTMLDocument)
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
            lastModified: await getLastModifiedHeader(href),
          }

          this.addResource(resourceNode)
        }
      }
    }
  }

  private async addFolder(node: HTMLElement, options: ExtensionOptions) {
    const href = parser.parseURLFromNode(node, "folder", options)

    const section = parser.parseSectionName(node, this.HTMLDocument)
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
      const { downloadFolderAsZip } = options

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
          parser.getQuerySelector("pluginfile", options)
        )
        for (const pluginFile of Array.from(folderFiles)) {
          await this.addPluginFile(pluginFile, options, resource.name)
        }
        return
      }
    }

    if (resource.href !== "") {
      resource.lastModified = await getLastModifiedHeader(resource.href)
    }

    this.addResource(resource)
  }

  private async addActivity(node: HTMLElement, options: ExtensionOptions) {
    const section = parser.parseSectionName(node, this.HTMLDocument)
    const sectionIndex = this.getSectionIndex(section)
    const href = parser.parseURLFromNode(node, "activity", options)
    if (href === "") return

    const activity: Activity = {
      href,
      name: parser.parseActivityNameFromNode(node),
      section: parser.parseSectionName(node, this.HTMLDocument),
      isNew: false,
      isUpdated: false,
      type: "activity",
      activityType: parser.parseActivityTypeFromNode(node),
      resourceIndex: this.activities.length + 1,
      sectionIndex,
    }

    if (
      this.previousSeenActivities !== null &&
      !this.previousSeenActivities.includes(activity.href)
    ) {
      activity.isNew = true
    }

    this.activities.push(activity)
  }

  async scan(testLocalStorage?: ExtensionStorage): Promise<void> {
    this.reset()

    //  Local storage course data
    const localStorage: ExtensionStorage = testLocalStorage || (await browser.storage.local.get())
    const { options, courseData } = localStorage

    if (courseData[this.link]) {
      // Course exists in locally stored data
      this.isFirstScan = false
      const storedCourseData = courseData[this.link]
      this.previousSeenResources = storedCourseData.seenResources
      this.previousSeenActivities = storedCourseData.seenActivities
      this.lastModifiedHeaders = storedCourseData.lastModifiedHeaders
    }

    const mainHTML = this.HTMLDocument.querySelector("#region-main")

    if (!mainHTML) {
      return
    }

    const modules = mainHTML.querySelectorAll<HTMLElement>("li[id^='module-']")
    if (modules && modules.length !== 0) {
      for (const node of Array.from(modules)) {
        const isFile = node.classList.contains("resource")
        const isFolder = node.classList.contains("folder")
        const isURL = node.classList.contains("url")

        if (isFile) {
          await this.addFile(node, options)
        } else if (isFolder) {
          await this.addFolder(node, options)
        } else if (isURL) {
          await this.addURLNode(node, options)
        } else {
          await this.addActivity(node, options)
        }
      }

      // Check for pluginfiles that could be anywhere on the page
      const pluginFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("pluginfile", options))
      )
      const mediaFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("media", options))
      )
      await Promise.all(pluginFileNodes.map((n) => this.addPluginFile(n, options)))
      await Promise.all(mediaFileNodes.map((n) => this.addPluginFile(n, options)))
    } else {
      // Backup solution that is a little more brute force
      const fileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("file", options))
      )
      const pluginFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("pluginfile", options))
      )
      const urlFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("url", options))
      )
      const mediaFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("media", options))
      )
      const folderNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("folder", options))
      )
      const activities = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("activity", options))
      )

      await Promise.all(fileNodes.map((n) => this.addFile(n, options)))
      await Promise.all(pluginFileNodes.map((n) => this.addPluginFile(n, options)))
      await Promise.all(urlFileNodes.map((n) => this.addURLNode(n, options)))
      await Promise.all(mediaFileNodes.map((n) => this.addPluginFile(n, options)))
      await Promise.all(folderNodes.map((n) => this.addFolder(n, options)))
      await Promise.all(activities.map((n) => this.addActivity(n, options)))
    }

    if (testLocalStorage) {
      return
    }

    if (this.lastModifiedHeaders === undefined) {
      this.lastModifiedHeaders = Object.fromEntries(
        this.resources.map((r) => [r.href, r.lastModified])
      )
    }

    courseData[this.link] = {
      seenResources: this.resources.filter((n) => !n.isNew).map((n) => n.href),
      newResources: this.resources.filter((n) => n.isNew).map((n) => n.href),
      seenActivities: this.activities.filter((n) => !n.isNew).map((n) => n.href),
      newActivities: this.activities.filter((n) => n.isNew).map((n) => n.href),
      lastModifiedHeaders: this.lastModifiedHeaders,
    }
    await browser.storage.local.set({ courseData })
  }

  async updateStoredResources(downloadedResources?: Resource[]): Promise<CourseData> {
    const { courseData }: ExtensionStorage = await browser.storage.local.get("courseData")
    const storedCourseData = courseData[this.link]
    const { seenResources, lastModifiedHeaders } = storedCourseData

    const newResources = this.resources.filter((n) => n.isNew)

    // Default behavior: Merge all stored new resources
    let toBeMerged = newResources

    // If downloaded resources are provided then only merge those
    if (downloadedResources) {
      toBeMerged = downloadedResources
    }

    // Merge already seen resources with new resources
    // Use set to remove duplicates
    const updatedSeenResources = Array.from(
      new Set(seenResources.concat(toBeMerged.map((r) => r.href)))
    )

    const updatedNewResources = newResources
      .filter((r) => !updatedSeenResources.includes(r.href))
      .map((r) => r.href)

    if (lastModifiedHeaders) {
      const toBeUpdated = toBeMerged

      if (downloadedResources === undefined) {
        const updatedResources = this.resources.filter((n) => n.isUpdated)
        toBeUpdated.push(...updatedResources)
      }

      toBeUpdated.forEach((r) => {
        lastModifiedHeaders[r.href] = r.lastModified
        r.isNew = false
        r.isUpdated = false
      })
    }

    const updatedCourseData = {
      ...(storedCourseData as Record<string, unknown>),
      seenResources: updatedSeenResources,
      newResources: updatedNewResources,
      lastModifiedHeaders,
    } as CourseData

    await browser.storage.local.set({
      courseData: {
        ...courseData,
        [this.link]: updatedCourseData,
      },
    })

    return updatedCourseData
  }

  async updateStoredActivities(): Promise<CourseData> {
    const { courseData }: ExtensionStorage = await browser.storage.local.get("courseData")
    const storedCourseData = courseData[this.link]

    const { seenActivities, newActivities } = storedCourseData
    const updatedSeenActivities = Array.from(new Set(seenActivities.concat(newActivities)))
    const updatedNewActivities: string[] = []

    const updatedCourseData = {
      ...(storedCourseData as Record<string, unknown>),
      seenActivities: updatedSeenActivities,
      newActivities: updatedNewActivities,
    } as CourseData

    await browser.storage.local.set({
      courseData: {
        ...courseData,
        [this.link]: updatedCourseData,
      },
    })

    return updatedCourseData
  }
}

export default Course
