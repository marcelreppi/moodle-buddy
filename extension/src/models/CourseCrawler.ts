import { ExtensionOptions, ExtensionStorage, Resource, Activity, CourseData } from "types"
import * as parser from "@shared/parser"
import { getMoodleBaseURL } from "@shared/regexHelpers"
import logger from "@shared/logger"
import PageCrawler from "./PageCrawler"

class CourseCrawler extends PageCrawler {
  isTilesFormat: boolean
  lastModifiedHeaders: Record<string, string | undefined> | undefined
  previousSeenResources: string[] | null
  previousSeenActivities: string[] | null

  constructor(link: string, HTMLDocument: Document, options: ExtensionOptions) {
    super(link, HTMLDocument, options)

    this.isTilesFormat = parser.isCourseTilesFormat(HTMLDocument)
    this.previousSeenResources = null
    this.previousSeenActivities = null
  }

  protected addResource(resource: Resource): void {
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

  protected addActivity(activity: Activity): void {
    if (
      this.previousSeenActivities !== null &&
      !this.previousSeenActivities.includes(activity.href)
    ) {
      activity.isNew = true
    }

    this.activities.push(activity)
  }

  async scan(testLocalStorage?: ExtensionStorage): Promise<void> {
    this.previousSeenResources = null
    this.previousSeenActivities = null

    //  Local storage course data
    const localStorage =
      testLocalStorage ?? ((await chrome.storage.local.get()) as ExtensionStorage)
    const { courseData } = localStorage

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

    if (!this.mainHTML) {
      return
    }

    if (this.isTilesFormat) {
      await this.processTiles()
    }

    await this.detectResourcesAndActivities(localStorage)

    if (testLocalStorage) {
      return
    }

    if (this.isTilesFormat) {
      // Deduplicate resources before saving, as injected tile fragments might be matched
      // multiple times across different fallback queries (e.g file vs pluginfile nodes)
      const uniqueResourcesMap = new Map<string, Resource>()
      for (const resource of this.resources) {
        if (!uniqueResourcesMap.has(resource.href)) {
          uniqueResourcesMap.set(resource.href, resource)
        }
      }
      this.resources = Array.from(uniqueResourcesMap.values())
    }

    if (this.lastModifiedHeaders === undefined) {
      this.lastModifiedHeaders = Object.fromEntries(
        this.resources.map((resource) => [resource.href, resource.lastModified])
      )
    }

    const updatedCourseData = {
      seenResources: this.resources.filter((n) => !n.isNew).map((n) => n.href),
      newResources: this.resources.filter((n) => n.isNew).map((n) => n.href),
      seenActivities: this.activities.filter((n) => !n.isNew).map((n) => n.href),
      newActivities: this.activities.filter((n) => n.isNew).map((n) => n.href),
      lastModifiedHeaders: this.lastModifiedHeaders,
    }
    courseData[this.link] = updatedCourseData

    logger.debug(`Storing course data in local storage for course ${this.name}`, {
      updatedCourseData,
    })
    await chrome.storage.local.set({ courseData } satisfies Partial<ExtensionStorage>)
  }

  async updateStoredResources(downloadedResources?: Resource[]): Promise<CourseData> {
    const { courseData } = (await chrome.storage.local.get("courseData")) as ExtensionStorage
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
    const storedCourseData = courseData[this.link]

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

  private async processTiles(): Promise<void> {
    if (!this.mainHTML) {
      return
    }

    const tiles = this.mainHTML.querySelectorAll<HTMLElement>("a.tile-link")
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
    this.mainHTML.appendChild(hiddenContainer)

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
      } catch (error) {
        logger.error(`Failed to fetch tile content for section ${sectionId}`, error)
      }
    })

    await Promise.all(fetchPromises)
    logger.debug("All tiles fetched and injected into hidden container")
  }

  private getSesskey(): string | undefined {
    // Try to get from M.cfg or from a logout link
    const scriptContent = Array.from(this.HTMLDocument.scripts)
      .map((script) => script.textContent)
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
      .map((script) => script.textContent)
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

  getNumberOfUpdates(): number {
    return [...this.resources, ...this.activities].filter((r) => r.isNew || r.isUpdated).length
  }
}

export default CourseCrawler
