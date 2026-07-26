import { ExtensionOptions, ExtensionStorage, Resource, Activity, CourseData } from "types"
import logger from "@shared/logger"
import PageCrawler from "./PageCrawler"

class CourseCrawler extends PageCrawler {
  previousSeenResources: string[] | null
  previousSeenActivities: string[] | null

  constructor(link: string, HTMLDocument: Document, options: ExtensionOptions) {
    super(link, HTMLDocument, options)

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

    await super.scan(testLocalStorage)

    logger.debug("Course scan finished", { course: this })

    if (testLocalStorage) {
      return
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

  getNumberOfUpdates(): number {
    return [...this.resources, ...this.activities].filter((r) => r.isNew || r.isUpdated).length
  }
}

export default CourseCrawler
