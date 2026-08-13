import { parseHTML } from "linkedom"
import { afterEach, describe, expect, it, vi } from "vitest"

import defaultExtensionOptions from "@shared/defaultExtensionOptions"
import { ExtensionStorage } from "types"
import Course from "../Course"
import CourseSection from "../CourseSection"

function createDocument(main = '<main id="region-main"></main>'): Document {
  return parseHTML(`
    <html>
      <body>
        <nav id="page-navbar">
          <ol><li><a title="Mathematical Foundations">MF-101</a></li></ol>
        </nav>
        ${main}
      </body>
    </html>
  `).document as unknown as Document
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("CourseSection", () => {
  it("reads its course context from the navbar", () => {
    const section = new CourseSection(
      "https://moodle.example.edu/course/view.php?id=42&section=3",
      createDocument(),
      { ...defaultExtensionOptions }
    )

    expect(section.name).toBe("Mathematical Foundations")
    expect(section.shortcut).toBe("MF-101")
    expect(section).toBeInstanceOf(Course)
  })

  it("stores section updates separately from the full course", async () => {
    const courseLink = "https://moodle.example.edu/course/view.php?id=42"
    const sectionLink = `${courseLink}&section=3`
    const storedCourseData = {
      seenResources: ["https://moodle.example.edu/mod/resource/view.php?id=1"],
      newResources: [],
      seenActivities: ["https://moodle.example.edu/mod/assign/view.php?id=2"],
      newActivities: [],
    }
    const storage: ExtensionStorage = {
      options: defaultExtensionOptions,
      browserId: "test",
      overviewCourseLinks: [],
      nUpdates: 0,
      userHasRated: false,
      totalDownloadedFiles: 0,
      rateHintLevel: 0,
      courseData: { [courseLink]: storedCourseData },
      lastBackgroundScanMillis: 0,
    }
    const get = vi.fn().mockResolvedValue(storage)
    const set = vi.fn()
    vi.stubGlobal("chrome", { storage: { local: { get, set } } })

    const section = new CourseSection(sectionLink, createDocument(), {
      ...defaultExtensionOptions,
    })
    await section.scan()

    expect(get).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledTimes(1)
    expect(storage.courseData[courseLink]).toEqual(storedCourseData)
    expect(storage.courseData[sectionLink]).toEqual({
      seenResources: [],
      newResources: [],
      seenActivities: [],
      newActivities: [],
      lastModifiedHeaders: {},
    })
  })

  it("compares section resources and activities with the section storage entry", async () => {
    const sectionLink = "https://moodle.example.edu/course/view.php?id=42&section=3"
    const resourceLink = "https://moodle.example.edu/mod/resource/view.php?id=7"
    const activityLink = "https://moodle.example.edu/mod/assign/view.php?id=8"
    const storage: ExtensionStorage = {
      options: defaultExtensionOptions,
      browserId: "test",
      overviewCourseLinks: [],
      nUpdates: 0,
      userHasRated: false,
      totalDownloadedFiles: 0,
      rateHintLevel: 0,
      courseData: {
        [sectionLink]: {
          seenResources: [resourceLink],
          newResources: [],
          seenActivities: [],
          newActivities: [],
        },
      },
      lastBackgroundScanMillis: 0,
    }
    const document = createDocument(`
      <main id="region-main">
        <section id="section-3" aria-label="Week 3">
          <li id="module-1" class="activity resource">
            <a href="${resourceLink}"><span class="instancename">Lecture notes</span></a>
          </li>
          <li id="module-2" class="activity modtype_assign">
            <a href="${activityLink}"><span class="instancename">Assignment</span></a>
          </li>
        </section>
      </main>
    `)
    const section = new CourseSection(sectionLink, document, { ...defaultExtensionOptions })

    await section.scan(storage)

    expect(section.resources[0]).toMatchObject({ href: resourceLink, isNew: false })
    expect(section.activities[0]).toMatchObject({ href: activityLink, isNew: true })
  })
})
