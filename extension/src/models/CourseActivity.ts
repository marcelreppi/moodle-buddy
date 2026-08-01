import { ExtensionOptions } from "types"
import * as parser from "@shared/parser"
import MoodlePage from "./MoodlePage"

class CourseActivity extends MoodlePage {
  constructor(link: string, HTMLDocument: Document, options: ExtensionOptions) {
    super(link, HTMLDocument, options)
  }

  protected parseCourseName(HTMLDocument: Document, options: ExtensionOptions): string {
    return parser.parseCourseNameFromNavBar(HTMLDocument, options)
  }

  protected parseCourseShortcut(HTMLDocument: Document, options: ExtensionOptions): string {
    return parser.parseCourseShortcutFromNavBar(HTMLDocument, options)
  }
}

export default CourseActivity
