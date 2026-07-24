import { ExtensionOptions } from "types"
import * as parser from "@shared/parser"
import PageCrawler from "./PageCrawler"

class ActivityCrawler extends PageCrawler {
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

export default ActivityCrawler
