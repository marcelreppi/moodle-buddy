import { parseHTML } from "linkedom"
import { describe, expect, it } from "vitest"

import { getSupportedPage } from "../detector"

function createDocument(bodyClass = "course-4822"): Document {
  return parseHTML(`<html><body class="${bodyClass}"></body></html>`)
    .document as unknown as Document
}

describe("getSupportedPage", () => {
  it("detects a full course", () => {
    expect(
      getSupportedPage("https://moodle.example.edu/course/view.php?id=4822", createDocument())
    ).toBe("course")
  })

  it("detects a course section from its section query", () => {
    expect(
      getSupportedPage(
        "https://moodle.example.edu/course/view.php?id=4822&section=24",
        createDocument()
      )
    ).toBe("courseSection")
  })

  it("detects the dedicated course section route", () => {
    expect(
      getSupportedPage("https://moodle.example.edu/course/section.php?id=1299900", createDocument())
    ).toBe("courseSection")
  })

  it("detects a course section from its sectionid query", () => {
    expect(
      getSupportedPage(
        "https://moodle.example.edu/course/view.php?id=1307&sectionid=106775",
        createDocument()
      )
    ).toBe("courseSection")
  })

  it("detects a course section from a paginated course format", () => {
    expect(
      getSupportedPage(
        "https://moodle.example.edu/course/view.php?id=4822",
        createDocument("format-onetopic course-4822")
      )
    ).toBe("courseSection")
  })

  it("keeps detecting other supported pages", () => {
    expect(
      getSupportedPage("https://moodle.example.edu/mod/quiz/view.php?id=7", createDocument())
    ).toBe("activity")
  })
})
