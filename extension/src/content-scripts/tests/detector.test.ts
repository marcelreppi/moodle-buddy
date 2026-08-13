import { describe, expect, it } from "vitest"

import { getSupportedPage } from "../detector"

describe("getSupportedPage", () => {
  it("detects a full course", () => {
    expect(getSupportedPage("https://moodle.example.edu/course/view.php?id=4822")).toBe("course")
  })

  it("routes a section query through the course content script", () => {
    expect(getSupportedPage("https://moodle.example.edu/course/view.php?id=4822&section=24")).toBe(
      "course"
    )
  })

  it("routes the dedicated section page through the course content script", () => {
    expect(getSupportedPage("https://moodle.example.edu/course/section.php?id=1299900")).toBe(
      "course"
    )
  })

  it("routes a sectionid query through the course content script", () => {
    expect(
      getSupportedPage("https://moodle.example.edu/course/view.php?id=1307&sectionid=106775")
    ).toBe("course")
  })

  it("keeps detecting other supported pages", () => {
    expect(getSupportedPage("https://moodle.example.edu/mod/quiz/view.php?id=7")).toBe("activity")
  })
})
