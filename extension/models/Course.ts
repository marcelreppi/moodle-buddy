import {
  ExtensionOptions,
  ExtensionStorage,
  Counts,
  Resource,
  Activity,
  FileResource,
  FolderResource,
  CourseData,
} from "types"
import * as parser from "../shared/parser"
import { isFolder } from "../shared/resourceHelpers"
import { getMoodleBaseURL } from "../shared/regexHelpers"

class Course {
  link: string
  HTMLDocument: Document
  name: string
  shortcut: string
  isFirstScan: boolean

  resources: Resource[]
  counts: Counts
  previousSeenResources: string[] | null

  activities: Activity[]
  previousSeenActivities: string[] | null

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
    this.counts = {
      nFiles: 0,
      nNewFiles: 0,
      nFolders: 0,
      nNewFolders: 0,
      nActivities: 0,
      nNewActivities: 0,
    }
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
    if (this.previousSeenResources === null || this.previousSeenResources.includes(resource.href)) {
      // If course has never been scanned previousSeenResources don't exist
      // Never treat a resource as new when the course is scanned for the first time
      // because we're capturing the initial state of the course
      resource.isNew = false
    } else {
      if (isFolder(resource)) {
        this.counts.nNewFolders++
      } else {
        this.counts.nNewFiles++
      }
      resource.isNew = true
    }

    this.resources.push(resource)
  }

  private addFile(node: HTMLElement, options: ExtensionOptions) {
    const href = parser.parseURLFromNode(node, "file", options)
    if (href === "") return

    this.counts.nFiles++
    const section = parser.parseSectionName(node, this.HTMLDocument)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FileResource = {
      href,
      name: parser.parseFileNameFromNode(node),
      section,
      type: "file",
      isNew: false,
      resourceIndex: this.counts.nFiles,
      sectionIndex,
    }

    this.addResource(resource)
  }

  private addPluginFile(node: HTMLElement, options: ExtensionOptions, partOfFolder = ""): void {
    const href = parser.parseURLFromNode(node, "pluginfile", options)
    if (href === "") return

    // Avoid duplicates
    const detectedURLs = this.resources.map((r) => r.href)
    if (detectedURLs.includes(href)) return

    this.counts.nFiles++
    const section = parser.parseSectionName(node, this.HTMLDocument)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FileResource = {
      href,
      name: parser.parseFileNameFromPluginFileURL(href),
      section,
      type: "pluginfile",
      partOfFolder,
      isNew: false,
      resourceIndex: this.counts.nFiles,
      sectionIndex,
    }

    this.addResource(resource)
  }

  private addURLNode(node: HTMLElement, options: ExtensionOptions) {
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

          this.counts.nFiles++
          const section = parser.parseSectionName(node, this.HTMLDocument)
          const sectionIndex = this.getSectionIndex(section)
          const resourceNode: FileResource = {
            href,
            name: parser.parseFileNameFromNode(node),
            section,
            type: "url",
            isNew: false,
            resourceIndex: this.counts.nFiles,
            sectionIndex,
          }

          this.addResource(resourceNode)
        }
      }
    }
  }

  private addFolder(node: HTMLElement, options: ExtensionOptions) {
    const section = parser.parseSectionName(node, this.HTMLDocument)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FolderResource = {
      href: parser.parseURLFromNode(node, "folder", options),
      name: parser.parseFileNameFromNode(node),
      section,
      type: "folder",
      isInline: false,
      isNew: false,
      resourceIndex: this.counts.nFiles,
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
          this.addPluginFile(pluginFile, options, resource.name)
        }
        return
      }
    }

    this.counts.nFolders++
    this.addResource(resource)
  }

  private addActivity(node: HTMLElement, options: ExtensionOptions) {
    const section = parser.parseSectionName(node, this.HTMLDocument)
    const sectionIndex = this.getSectionIndex(section)
    const href = parser.parseURLFromNode(node, "activity", options)
    if (href === "") return

    this.counts.nActivities++
    const activity: Activity = {
      href,
      name: parser.parseActivityNameFromNode(node),
      section: parser.parseSectionName(node, this.HTMLDocument),
      isNew: false,
      type: "activity",
      activityType: parser.parseActivityTypeFromNode(node),
      resourceIndex: this.counts.nActivities,
      sectionIndex,
    }

    if (
      this.previousSeenActivities === null ||
      this.previousSeenActivities.includes(activity.href)
    ) {
      activity.isNew = false
    } else {
      this.counts.nNewActivities++
      activity.isNew = true
    }

    this.activities.push(activity)
  }

  async scan(testLocalStorage?: ExtensionStorage): Promise<void> {
    // Reset the counts
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
          this.addFile(node, options)
        } else if (isFolder) {
          this.addFolder(node, options)
        } else if (isURL) {
          this.addURLNode(node, options)
        } else {
          this.addActivity(node, options)
        }
      }

      // Check for pluginfiles that could be anywhere on the page
      const pluginFileNodes = mainHTML.querySelectorAll<HTMLElement>(
        parser.getQuerySelector("pluginfile", options)
      )
      const mediaFileNodes = mainHTML.querySelectorAll<HTMLElement>(
        parser.getQuerySelector("media", options)
      )
      pluginFileNodes.forEach((n) => this.addPluginFile(n, options))
      mediaFileNodes.forEach((n) => this.addPluginFile(n, options))
    } else {
      // Backup solution that is a little more brute force
      const fileNodes = mainHTML.querySelectorAll<HTMLElement>(
        parser.getQuerySelector("file", options)
      )
      const pluginFileNodes = mainHTML.querySelectorAll<HTMLElement>(
        parser.getQuerySelector("pluginfile", options)
      )
      const urlFileNodes = mainHTML.querySelectorAll<HTMLElement>(
        parser.getQuerySelector("url", options)
      )
      const mediaFileNodes = mainHTML.querySelectorAll<HTMLElement>(
        parser.getQuerySelector("media", options)
      )
      const folderNodes = mainHTML.querySelectorAll<HTMLElement>(
        parser.getQuerySelector("folder", options)
      )
      const activities = mainHTML.querySelectorAll<HTMLElement>(
        parser.getQuerySelector("activity", options)
      )

      fileNodes.forEach((n) => this.addFile(n, options))
      pluginFileNodes.forEach((n) => this.addPluginFile(n, options))
      urlFileNodes.forEach((n) => this.addURLNode(n, options))
      mediaFileNodes.forEach((n) => this.addPluginFile(n, options))
      folderNodes.forEach((n) => this.addFolder(n, options))
      activities.forEach((n) => this.addActivity(n, options))
    }

    if (testLocalStorage) {
      return
    }

    courseData[this.link] = {
      seenResources: this.resources.filter((n) => !n.isNew).map((n) => n.href),
      newResources: this.resources.filter((n) => n.isNew).map((n) => n.href),
      seenActivities: this.activities.filter((n) => !n.isNew).map((n) => n.href),
      newActivities: this.activities.filter((n) => n.isNew).map((n) => n.href),
    }
    await browser.storage.local.set({ courseData })
  }

  async updateStoredResources(downloadedResources?: Resource[]): Promise<CourseData> {
    const { courseData }: ExtensionStorage = await browser.storage.local.get("courseData")
    const storedCourseData = courseData[this.link]
    const { seenResources, newResources } = storedCourseData

    // Default behavior: Merge all stored new resources
    let toBeMerged = newResources

    // If downloaded resources are provided then only merge those
    if (downloadedResources) {
      toBeMerged = downloadedResources.map((r: Resource) => r.href)
    }

    // Merge already seen resources with new resources
    // Use set to remove duplicates
    const updatedSeenResources = Array.from(new Set(seenResources.concat(toBeMerged)))
    const updatedNewResources = newResources.filter((r) => !updatedSeenResources.includes(r))

    const updatedCourseData = {
      ...(storedCourseData as Record<string, unknown>),
      seenResources: updatedSeenResources,
      newResources: updatedNewResources,
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
