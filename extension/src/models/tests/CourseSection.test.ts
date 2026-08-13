import { parseHTML } from "linkedom"
import { afterEach, describe, expect, it, vi } from "vitest"

import defaultExtensionOptions from "@shared/defaultExtensionOptions"
import { ExtensionStorage } from "types"
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
  })

  it("scans a section without overwriting the stored full course", async () => {
    const courseLink = "https://moodle.example.edu/course/view.php?id=42"
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

    const section = new CourseSection(`${courseLink}&section=3`, createDocument(), {
      ...defaultExtensionOptions,
    })
    await section.scan()

    expect(get).toHaveBeenCalledTimes(1)
    expect(set).not.toHaveBeenCalled()
    expect(storage.courseData[courseLink]).toEqual(storedCourseData)
  })
})
