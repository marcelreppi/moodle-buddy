import { ExtensionOptions } from "types"
import * as parser from "@shared/parser"
import Course from "./Course"

class CourseSection extends Course {
  protected parseCourseName(HTMLDocument: Document, options: ExtensionOptions): string {
    const navbarName = parser.parseCourseNameFromNavBar(HTMLDocument, options)
    if (navbarName !== "Unknown Course") return navbarName

    return parser.parseCourseNameFromCoursePage(HTMLDocument, options)
  }

  protected parseCourseShortcut(HTMLDocument: Document, options: ExtensionOptions): string {
    if (!options.customSelectorCourseShortcut) {
      const sectionBreadcrumb = HTMLDocument.querySelector(
        "#page-navbar [data-section-name-for], #page-navbar .breadcrumb-item:last-child, #region-main [data-section-name-for], #region-main .nav-link.active[title]"
      )
      const sectionName =
        sectionBreadcrumb?.getAttribute("title")?.trim() ?? sectionBreadcrumb?.textContent?.trim()
      if (sectionName) return sectionName
    }

    return parser.parseCourseShortcutFromNavBar(HTMLDocument, options)
  }
}

export default CourseSection
