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

  protected getSectionName(node: HTMLElement): string {
    return this.name
  }

  protected getSectionIndex(section: string): number {
    const sectionNode = document.querySelector<HTMLElement>("li[id^='section-']")
    if (!sectionNode) return -1

    const sectionId = sectionNode.id.split("-").pop()
    if (!sectionId) return -1

    return parseInt(sectionId, 10)
  }
}

export default CourseSection
