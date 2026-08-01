import { parseHTML } from "linkedom"
import { afterEach, describe, expect, it, vi } from "vitest"

import defaultExtensionOptions from "@shared/defaultExtensionOptions"
import { ExtensionStorage } from "types"
import CourseActivity from "../CourseActivity"
import Course from "../Course"

const courseLink = "https://moodle.example.edu/course/view.php?id=42"

function createDocument(body: string): Document {
  return parseHTML(`<html><body>${body}</body></html>`).document as unknown as Document
}

function createStorage(): ExtensionStorage {
  return {
    options: defaultExtensionOptions,
    browserId: "test",
    overviewCourseLinks: [],
    nUpdates: 0,
    userHasRated: false,
    totalDownloadedFiles: 0,
    rateHintLevel: 0,
    courseData: {
      [courseLink]: {
        seenResources: ["https://moodle.example.edu/existing.pdf"],
        newResources: [],
        seenActivities: ["https://moodle.example.edu/mod/assign/view.php?id=1"],
        newActivities: [],
      },
    },
    lastBackgroundScanMillis: 0,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Course", () => {
  it("uses the course implementation directly", () => {
    const course = new Course(courseLink, createDocument('<main id="region-main"></main>'), {
      ...defaultExtensionOptions,
    })

    expect(course).toBeInstanceOf(Course)
    expect(course.constructor.name).toBe("Course")
  })

  it("keeps course-only state off the activity crawler", () => {
    const activity = new CourseActivity(
      "https://moodle.example.edu/mod/assign/view.php?id=8",
      createDocument('<main id="region-main"></main>'),
      { ...defaultExtensionOptions }
    )

    expect("isTilesFormat" in activity).toBe(false)
    expect("lastModifiedHeaders" in activity).toBe(false)
  })

  it("does not overwrite stored data when the page has no main region", async () => {
    const storage = createStorage()
    const get = vi.fn().mockResolvedValue(storage)
    const set = vi.fn()
    vi.stubGlobal("chrome", { storage: { local: { get, set } } })

    const course = new Course(courseLink, createDocument("<p>Login required</p>"), {
      ...defaultExtensionOptions,
    })
    await course.scan()

    expect(get).toHaveBeenCalledTimes(1)
    expect(set).not.toHaveBeenCalled()
    expect(storage.courseData[courseLink].seenResources).toEqual([
      "https://moodle.example.edu/existing.pdf",
    ])
  })

  it("uses one storage snapshot and persists a completed production scan", async () => {
    const storage = createStorage()
    const get = vi.fn().mockResolvedValue(storage)
    const set = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("chrome", { storage: { local: { get, set } } })

    const course = new Course(courseLink, createDocument('<main id="region-main"></main>'), {
      ...defaultExtensionOptions,
    })
    await course.scan()

    expect(get).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledTimes(1)
    expect(storage.courseData[courseLink]).toEqual({
      seenResources: [],
      newResources: [],
      seenActivities: [],
      newActivities: [],
      lastModifiedHeaders: {},
    })
  })

  it("preserves resource and activity new-state detection in test scans", async () => {
    const resourceLink = "https://moodle.example.edu/mod/resource/view.php?id=7"
    const activityLink = "https://moodle.example.edu/mod/assign/view.php?id=8"
    const storage = createStorage()
    storage.courseData[courseLink].seenResources = [resourceLink]
    storage.courseData[courseLink].seenActivities = []

    const document = createDocument(`
      <main id="region-main">
        <section id="section-1" aria-label="Week 1">
          <li id="module-1" class="activity resource">
            <a href="${resourceLink}"><span class="instancename">Lecture notes</span></a>
          </li>
          <li id="module-2" class="activity modtype_assign">
            <a href="${activityLink}"><span class="instancename">Assignment</span></a>
          </li>
        </section>
      </main>
    `)
    const course = new Course(courseLink, document, { ...defaultExtensionOptions })

    await course.scan(storage)

    expect(course.resources).toMatchObject([
      {
        href: resourceLink,
        name: "Lecture notes",
        section: "Week 1",
        isNew: false,
        isUpdated: false,
        resourceIndex: 1,
        sectionIndex: 1,
      },
    ])
    expect(course.activities).toMatchObject([
      {
        href: activityLink,
        name: "Assignment",
        section: "Week 1",
        activityType: "assign",
        isNew: true,
        resourceIndex: 1,
        sectionIndex: 1,
      },
    ])
  })
})
