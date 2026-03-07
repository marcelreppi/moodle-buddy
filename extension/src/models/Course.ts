import {
  ExtensionOptions,
  ExtensionStorage,
  Resource,
  Activity,
  AssignmentResource,
  FileResource,
  FolderResource,
  CourseData,
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
const assignmentURLRegex = getURLRegex("assignment")

class Course {
  link: string
  HTMLDocument: Document
  name: string
  shortcut: string
  isFirstScan: boolean
  isCoursePage: boolean
  isTilesFormat: boolean
  options: ExtensionOptions

  resources: Resource[]
  previousSeenResources: string[] | null

  activities: Activity[]
  previousSeenActivities: string[] | null

  lastModifiedHeaders: Record<string, string | undefined> | undefined

  sectionIndices: Record<string, number>

  constructor(link: string, HTMLDocument: Document, options: ExtensionOptions) {
    this.link = link
    this.HTMLDocument = HTMLDocument
    this.options = options
    this.name = parser.parseCourseNameFromCoursePage(HTMLDocument, options)
    this.shortcut = parser.parseCourseShortcut(HTMLDocument, options)
    this.isFirstScan = true
    this.isCoursePage = !!link.match(courseURLRegex)
    this.isTilesFormat = parser.isCourseTilesFormat(HTMLDocument)

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

  private createCourseDataSnapshot(): CourseData {
    const lastModifiedHeaders =
      this.lastModifiedHeaders ?? Object.fromEntries(this.resources.map((r) => [r.href, r.lastModified]))

    return {
      seenResources: this.resources.filter((resource) => !resource.isNew).map((resource) => resource.href),
      newResources: this.resources.filter((resource) => resource.isNew).map((resource) => resource.href),
      seenActivities: this.activities.filter((activity) => !activity.isNew).map((activity) => activity.href),
      newActivities: this.activities.filter((activity) => activity.isNew).map((activity) => activity.href),
      lastModifiedHeaders,
    }
  }

  private addResource(resource: Resource): void {
    if (this.previousSeenResources !== null) {
      const hasNotBeenSeenBefore = !this.previousSeenResources.includes(resource.href)
      if (hasNotBeenSeenBefore) {
        resource.isNew = true
        logger.debug(resource, "New resource detected")
      }

      if (this.options.detectFileUpdates) {
        const hasBeenUpdated =
          (this.lastModifiedHeaders ?? {})[resource.href] !== resource.lastModified
        if (!resource.isNew && hasBeenUpdated) {
          resource.isUpdated = true
        }
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

  private async addAssignmentResource(
    href: string,
    name: string,
    section: string,
    sectionIndex: number
  ) {
    const resource: AssignmentResource = {
      href,
      name,
      section,
      type: "assignment",
      isNew: false,
      isUpdated: false,
      resourceIndex: this.resources.length + 1,
      sectionIndex,
      lastModified: await getLastModifiedHeader(href, this.options),
    }

    this.addResource(resource)
  }

  private async addAssignment(node: HTMLElement) {
    const href = parser.parseURLFromNode(node, "activity", this.options)
    if (href === "") return

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const name = parser.parseActivityNameFromNode(node)
    await this.addAssignmentResource(href, name, section, sectionIndex)
  }

  private async addCurrentAssignmentPage() {
    const courseName = parser.parseCourseNameFromBreadcrumb(this.HTMLDocument)
    if (courseName) this.name = courseName
    const section = parser.parseSectionFromBreadcrumb(this.HTMLDocument)
    const sectionIndex = this.getSectionIndex(section)
    const name = parser.parseAssignmentNameFromPage(this.HTMLDocument)
    await this.addAssignmentResource(this.link, name, section, sectionIndex)
  }

  private async addActivity(node: HTMLElement) {
    if (!this.isCoursePage) {
      return
    }

    const activityType = parser.parseActivityTypeFromNode(node)
    if (activityType === "assign") {
      await this.addAssignment(node)
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
      activityType,
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
    this.resources = []
    this.previousSeenResources = null

    this.activities = []
    this.previousSeenActivities = null

    this.sectionIndices = {}

    //  Local storage course data
    const localStorage =
      testLocalStorage ?? ((await chrome.storage.local.get()) as ExtensionStorage)
    const { options, courseData } = localStorage

    this.options = options

    if (courseData[this.link]) {
      // Course exists in locally stored data
      this.isFirstScan = false
      const storedCourseData = courseData[this.link]
      logger.debug(storedCourseData, "Course was found in local storage")

      this.previousSeenResources = storedCourseData.seenResources
      this.previousSeenActivities = storedCourseData.seenActivities
      this.lastModifiedHeaders = storedCourseData.lastModifiedHeaders
    } else {
      logger.debug(`New course detected ${this.name}`)
    }

    const mainHTML = this.HTMLDocument.querySelector("#region-main")

    if (!mainHTML) {
      return
    }

    if (this.isTilesFormat) {
      await this.processTiles(mainHTML as HTMLElement)
    }

    if (this.link.match(assignmentURLRegex)) {
      await this.addCurrentAssignmentPage()
      logger.debug("Assignment page scan finished", { course: this })
    } else {
      const modules = mainHTML.querySelectorAll<HTMLElement>("li[id^='module-']")
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
            await this.addActivity(node)
          }
        }

        // Check for pluginfiles that could be anywhere on the page
        const pluginFileNodes = Array.from(
          mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("pluginfile", this.options))
        )
        const mediaFileNodes = Array.from(
          mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("media", this.options))
        )
        await Promise.all(pluginFileNodes.map((n) => this.addPluginFile(n)))
        await Promise.all(mediaFileNodes.map((n) => this.addPluginFile(n)))
      } else {
        // Backup solution that is a little more brute force
        const fileNodes = Array.from(
          mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("file", this.options))
        )
        const pluginFileNodes = Array.from(
          mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("pluginfile", this.options))
        )
        const urlFileNodes = Array.from(
          mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("url", this.options))
        )
        const mediaFileNodes = Array.from(
          mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("media", this.options))
        )
        const folderNodes = Array.from(
          mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("folder", this.options))
        )
        const activities = Array.from(
          mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("activity", this.options))
        )

        await Promise.all(fileNodes.map((n) => this.addFile(n)))
        await Promise.all(pluginFileNodes.map((n) => this.addPluginFile(n)))
        await Promise.all(urlFileNodes.map((n) => this.addURLNode(n)))
        await Promise.all(mediaFileNodes.map((n) => this.addPluginFile(n)))
        await Promise.all(folderNodes.map((n) => this.addFolder(n)))
        await Promise.all(activities.map((n) => this.addActivity(n)))
      }

      logger.debug("Course scan finished", { course: this })
    }

    if (testLocalStorage) {
      return
    }

    if (this.isTilesFormat) {
      // Deduplicate resources before saving, as injected tile fragments might be matched
      // multiple times across different fallback queries (e.g file vs pluginfile nodes)
      const uniqueResourcesMap = new Map<string, Resource>()
      for (const res of this.resources) {
        if (!uniqueResourcesMap.has(res.href)) {
          uniqueResourcesMap.set(res.href, res)
        }
      }
      this.resources = Array.from(uniqueResourcesMap.values())
    }

    if (this.lastModifiedHeaders === undefined) {
      this.lastModifiedHeaders = Object.fromEntries(
        this.resources.map((r) => [r.href, r.lastModified])
      )
    }

    const updatedCourseData = this.createCourseDataSnapshot()
    courseData[this.link] = updatedCourseData

    logger.debug(`Storing course data in local storage for course ${this.name}`, {
      updatedCourseData,
    })
    await chrome.storage.local.set({ courseData } satisfies Partial<ExtensionStorage>)
  }

  async updateStoredResources(downloadedResources?: Resource[]): Promise<CourseData> {
    const { courseData } = (await chrome.storage.local.get("courseData")) as ExtensionStorage
    const storedCourseData = courseData[this.link] ?? this.createCourseDataSnapshot()
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
    logger.debug(toBeMerged, "Adding resources to list of seen resources")
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
      ...(storedCourseData as CourseData),
      seenResources: updatedSeenResources,
      newResources: updatedNewResources,
      lastModifiedHeaders,
    } satisfies CourseData

    logger.debug(updatedCourseData, "Storing updated course data in local storage")
    await chrome.storage.local.set({
      courseData: {
        ...courseData,
        [this.link]: updatedCourseData,
      },
    } satisfies Partial<ExtensionStorage>)

    return updatedCourseData
  }

  async updateStoredActivities(): Promise<CourseData> {
    const { courseData } = (await chrome.storage.local.get("courseData")) as ExtensionStorage
    const storedCourseData = courseData[this.link] ?? this.createCourseDataSnapshot()

    const { seenActivities, newActivities } = storedCourseData
    logger.debug(newActivities, "Adding activities to list of seen activities")
    const updatedSeenActivities = Array.from(new Set(seenActivities.concat(newActivities)))
    const updatedNewActivities: string[] = []

    const updatedCourseData = {
      ...(storedCourseData as CourseData),
      seenActivities: updatedSeenActivities,
      newActivities: updatedNewActivities,
    } satisfies CourseData

    await chrome.storage.local.set({
      courseData: {
        ...courseData,
        [this.link]: updatedCourseData,
      },
    } satisfies Partial<ExtensionStorage>)

    return updatedCourseData
  }

  getNumberOfUpdates(): number {
    return [...this.resources, ...this.activities].filter((r) => r.isNew || r.isUpdated).length
  }

  private async processTiles(mainHTML: HTMLElement): Promise<void> {
    const tiles = mainHTML.querySelectorAll<HTMLElement>("a.tile-link")
    if (tiles.length === 0) return

    logger.debug(`Processing ${tiles.length} tiles for dynamic content via AJAX`)

    const sesskey = this.getSesskey()
    const contextId = this.getContextId()

    if (!sesskey || !contextId) {
      logger.warn("Could not find sesskey or contextid, falling back to visual clicks")
      for (const tile of Array.from(tiles)) {
        tile.click()
        await this.sleep(500)
      }
      return
    }

    // Create a hidden container for the fetched content so scanner can find modules
    const hiddenContainer = this.HTMLDocument.createElement("div")
    hiddenContainer.id = "moodle-buddy-tiles-content"
    hiddenContainer.style.display = "none"
    mainHTML.appendChild(hiddenContainer)

    const fetchPromises = Array.from(tiles).map(async (tile) => {
      const url = new URL((tile as HTMLAnchorElement).href)
      const sectionId = url.searchParams.get("id")
      if (!sectionId) return

      try {
        const content = await this.fetchTileContent(sectionId, sesskey, contextId)
        if (content) {
          const wrapper = this.HTMLDocument.createElement("div")
          wrapper.id = `section-${sectionId}`
          const tileContainer = tile.closest(".tile") || tile
          const titleElement = tileContainer.querySelector("h3")
          const title =
            titleElement?.textContent?.trim() || tile.textContent?.trim() || `Section ${sectionId}`
          wrapper.setAttribute("aria-label", title)
          wrapper.innerHTML = content
          hiddenContainer.appendChild(wrapper)
        }
      } catch (e) {
        logger.error(`Failed to fetch tile content for section ${sectionId}`, e)
      }
    })

    await Promise.all(fetchPromises)
    logger.debug("All tiles fetched and injected into hidden container")
  }

  private getSesskey(): string | undefined {
    // Try to get from M.cfg or from a logout link
    const scriptContent = Array.from(this.HTMLDocument.scripts)
      .map((s) => s.textContent)
      .join(" ")
    const match = scriptContent.match(/"sesskey":"([^"]+)"/)
    if (match) return match[1]

    const logoutLink = this.HTMLDocument.querySelector<HTMLAnchorElement>(
      'a[href*="login/logout.php?sesskey="]'
    )
    if (logoutLink) {
      const url = new URL(logoutLink.href)
      return url.searchParams.get("sesskey") ?? undefined
    }

    return undefined
  }

  private getContextId(): string | undefined {
    const scriptContent = Array.from(this.HTMLDocument.scripts)
      .map((s) => s.textContent)
      .join(" ")
    const match = scriptContent.match(/"contextid":(\d+)/)
    if (match) return match[1]

    // Fallback: look for body classes or other indicators
    const bodyClass = this.HTMLDocument.body.className
    const contextMatch = bodyClass.match(/context-(\d+)/)
    if (contextMatch) return contextMatch[1]

    return undefined
  }

  private async fetchTileContent(
    sectionId: string,
    sesskey: string,
    contextId: string
  ): Promise<string | undefined> {
    const baseURL = getMoodleBaseURL(this.link)
    const url = `${baseURL}/lib/ajax/service.php?sesskey=${sesskey}&info=core_get_fragment`

    const payload = [
      {
        index: 0,
        methodname: "core_get_fragment",
        args: {
          component: "format_tiles",
          callback: "get_cm_list",
          contextid: parseInt(contextId),
          args: [
            {
              name: "sectionid",
              value: parseInt(sectionId),
            },
          ],
        },
      },
    ]

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) return undefined

    const data = await response.json()
    return data[0]?.data?.html
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default Course
