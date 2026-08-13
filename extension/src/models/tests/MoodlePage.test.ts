import { parseHTML } from "linkedom"
import { describe, expect, it } from "vitest"

import defaultExtensionOptions from "@shared/defaultExtensionOptions"
import { ExtensionStorage } from "types"
import MoodlePage from "../MoodlePage"

class CustomSectionPage extends MoodlePage {
  protected getSectionName(): string {
    return "Overridden section"
  }
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
    courseData: {},
    lastBackgroundScanMillis: 0,
  }
}

describe("MoodlePage", () => {
  it("uses the overridable section-name parser for resources and activities", async () => {
    const { document } = parseHTML(`
      <html><body><main id="region-main">
        <li id="module-1" class="activity resource">
          <a href="https://moodle.example.edu/mod/resource/view.php?id=1">
            <span class="instancename">Lecture notes</span>
          </a>
        </li>
        <li id="module-2" class="activity modtype_assign">
          <a href="https://moodle.example.edu/mod/assign/view.php?id=2">
            <span class="instancename">Assignment</span>
          </a>
        </li>
      </main></body></html>
    `)
    const page = new CustomSectionPage(
      "https://moodle.example.edu/course/view.php?id=42",
      document as unknown as Document,
      { ...defaultExtensionOptions }
    )

    await page.scan(createStorage())

    expect(page.resources[0].section).toBe("Overridden section")
    expect(page.activities[0].section).toBe("Overridden section")
  })
})
