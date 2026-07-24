import {
  ExtensionOptions,
  ExtensionStorage,
  Resource,
  Activity,
  FileResource,
  FolderResource,
  CourseData,
} from "types"
import * as parser from "@shared/parser"
import { getMoodleBaseURL, getURLRegex } from "@shared/regexHelpers"
import logger from "@shared/logger"

async function getLastModifiedHeader(href: string, options: ExtensionOptions) {
  if (!options.detectFileUpdates) return

  const headResponse = await fetch(href, {
    method: "HEAD",
  })
  const lastModified = headResponse.headers.get("last-modified")
  return lastModified ?? undefined
}

const courseURLRegex = getURLRegex("course")

class PageCrawler {
  link: string
  HTMLDocument: Document
  name: string
  shortcut: string
  title: string
  isFirstScan: boolean
  isCoursePage: boolean
  isTilesFormat: boolean
  options: ExtensionOptions

  resources: Resource[]
  activities: Activity[]
  lastModifiedHeaders: Record<string, string | undefined> | undefined
  sectionIndices: Record<string, number>

  constructor(link: string, HTMLDocument: Document, options: ExtensionOptions) {
    this.link = link
    this.HTMLDocument = HTMLDocument
    this.options = options
    this.name = this.parseCourseName(HTMLDocument, options)
    this.shortcut = this.parseCourseShortcut(HTMLDocument, options)
    this.title = this.parsePageTitle(HTMLDocument, options)
    this.isFirstScan = true
    this.isCoursePage = !!link.match(courseURLRegex)
    this.isTilesFormat = parser.isCourseTilesFormat(HTMLDocument)

    this.resources = []
    this.activities = []
    this.sectionIndices = {}
  }

  protected parsePageTitle(HTMLDocument: Document, options: ExtensionOptions): string {
    return parser.parsePageTitle(HTMLDocument, options)
  }

  protected parseCourseName(HTMLDocument: Document, options: ExtensionOptions): string {
    return parser.parseCourseNameFromCoursePage(HTMLDocument, options)
  }

  protected parseCourseShortcut(HTMLDocument: Document, options: ExtensionOptions): string {
    return parser.parseCourseShortcut(HTMLDocument, options)
  }

  private getSectionIndex(section: string): number {
    if (this.sectionIndices[section] === undefined) {
      this.sectionIndices[section] = Object.keys(this.sectionIndices).length
    }

    return this.sectionIndices[section] + 1
  }

  protected addResource(resource: Resource): void {
    this.resources.push(resource)
  }

  private async addFile(node: HTMLElement) {
    const href = parser.parseURLFromNode(node, "file", this.options)
    if (href === "") return

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FileResource = {
      href,
      name: parser.parseFileNameFromNode(node),
      section,
      type: "file",
      isNew: false,
      isUpdated: false,
      resourceIndex: this.resources.length + 1,
      sectionIndex,
      lastModified: await getLastModifiedHeader(href, this.options),
    }

    this.addResource(resource)
  }

  private async addPluginFile(node: HTMLElement, partOfFolder = "") {
    let href = parser.parseURLFromNode(node, "pluginfile", this.options)
    if (href === "") return

    // Avoid duplicates
    const detectedURLs = this.resources.map((r) => r.href)
    if (detectedURLs.includes(href)) return

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FileResource = {
      href,
      name: parser.parseFileNameFromPluginFileURL(href),
      section,
      type: "pluginfile",
      partOfFolder,
      isNew: false,
      isUpdated: false,
      resourceIndex: this.resources.length + 1,
      sectionIndex,
      lastModified: await getLastModifiedHeader(href, this.options),
    }

    this.addResource(resource)
  }

  private async addURLNode(node: HTMLElement) {
    // Make sure URL is a downloadable file
    const activityIcon: HTMLImageElement | null = node.querySelector("img.activityicon")
    if (activityIcon) {
      const imgName = activityIcon.src.split("/").pop()
      if (imgName) {
        // "icon" image is usually used for websites but I can't download full websites
        // Only support external URLs when they point to a file
        const isFile = imgName !== "icon"
        if (isFile) {
          // File has been identified as downloadable
          const href = parser.parseURLFromNode(node, "url", this.options)
          if (href === "") return

          const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
          const sectionIndex = this.getSectionIndex(section)
          const resourceNode: FileResource = {
            href,
            name: parser.parseFileNameFromNode(node),
            section,
            type: "url",
            isNew: false,
            isUpdated: false,
            resourceIndex: this.resources.length + 1,
            sectionIndex,
            lastModified: await getLastModifiedHeader(href, this.options),
          }

          this.addResource(resourceNode)
        }
      }
    }
  }

  private async addFolder(node: HTMLElement) {
    const href = parser.parseURLFromNode(node, "folder", this.options)

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const resource: FolderResource = {
      href,
      name: parser.parseFileNameFromNode(node),
      section,
      type: "folder",
      isInline: false,
      isNew: false,
      isUpdated: false,
      resourceIndex: this.resources.length + 1,
      sectionIndex,
    }

    if (resource.href === "") {
      // Folder could be displayed inline
      const downloadButtonVisible = parser.getDownloadButton(node) !== null
      const { downloadFolderAsZip } = this.options

      if (downloadFolderAsZip && downloadButtonVisible) {
        const downloadIdTag = parser.getDownloadIdTag(node)
        if (downloadIdTag === null) return

        const baseURL = getMoodleBaseURL(this.link)
        const downloadId = downloadIdTag.getAttribute("value")
        const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadId}`

        resource.href = downloadURL
        resource.isInline = true
      } else {
        // Not downloading via button as ZIP
        // Download folder as individual pluginfiles
        // Look for any pluginfiles
        const folderFiles = node.querySelectorAll<HTMLElement>(
          parser.getQuerySelector("pluginfile", this.options)
        )
        for (const pluginFile of Array.from(folderFiles)) {
          await this.addPluginFile(pluginFile, resource.name)
        }
        return
      }
    }

    if (resource.href !== "") {
      resource.lastModified = await getLastModifiedHeader(resource.href, this.options)
    }

    this.addResource(resource)
  }

  private async addActivityNode(node: HTMLElement) {
    if (!this.isCoursePage) {
      return
    }

    const section = parser.parseSectionName(node, this.HTMLDocument, this.options)
    const sectionIndex = this.getSectionIndex(section)
    const href = parser.parseURLFromNode(node, "activity", this.options)
    if (href === "") return

    const activity: Activity = {
      href,
      name: parser.parseActivityNameFromNode(node),
      section: parser.parseSectionName(node, this.HTMLDocument, this.options),
      isNew: false,
      isUpdated: false,
      type: "activity",
      activityType: parser.parseActivityTypeFromNode(node),
      resourceIndex: this.activities.length + 1,
      sectionIndex,
    }

    this.addActivity(activity)
  }

  protected addActivity(activity: Activity) {
    this.activities.push(activity)
  }

  async scan(testLocalStorage?: ExtensionStorage): Promise<void> {
    this.resources = []
    this.activities = []
    this.sectionIndices = {}

    //  Local storage course data
    const localStorage =
      testLocalStorage ?? ((await chrome.storage.local.get()) as ExtensionStorage)
    const { options } = localStorage

    this.options = options

    const mainHTML = this.HTMLDocument.querySelector("#region-main")

    if (!mainHTML) {
      return
    }

    if (this.isTilesFormat) {
      await this.processTiles(mainHTML as HTMLElement)
    }

    const modules = mainHTML.querySelectorAll<HTMLElement>("li[id^='module-']")
    if (modules && modules.length !== 0) {
      for (const node of Array.from(modules)) {
        const isFile = node.classList.contains("resource")
        const isFolder = node.classList.contains("folder")
        const isURL = node.classList.contains("url")

        if (isFile) {
          await this.addFile(node)
        } else if (isFolder) {
          await this.addFolder(node)
        } else if (isURL) {
          await this.addURLNode(node)
        } else {
          await this.addActivityNode(node)
        }
      }

      // Check for pluginfiles that could be anywhere on the page
      const pluginFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("pluginfile", this.options))
      )
      const mediaFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("media", this.options))
      )
      await Promise.all(pluginFileNodes.map((n) => this.addPluginFile(n)))
      await Promise.all(mediaFileNodes.map((n) => this.addPluginFile(n)))
    } else {
      // Backup solution that is a little more brute force
      const fileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("file", this.options))
      )
      const pluginFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("pluginfile", this.options))
      )
      const urlFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("url", this.options))
      )
      const mediaFileNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("media", this.options))
      )
      const folderNodes = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("folder", this.options))
      )
      const activities = Array.from(
        mainHTML.querySelectorAll<HTMLElement>(parser.getQuerySelector("activity", this.options))
      )

      await Promise.all(fileNodes.map((n) => this.addFile(n)))
      await Promise.all(pluginFileNodes.map((n) => this.addPluginFile(n)))
      await Promise.all(urlFileNodes.map((n) => this.addURLNode(n)))
      await Promise.all(mediaFileNodes.map((n) => this.addPluginFile(n)))
      await Promise.all(folderNodes.map((n) => this.addFolder(n)))
      await Promise.all(activities.map((n) => this.addActivityNode(n)))
    }

    logger.debug("Course scan finished", { course: this })

    if (testLocalStorage) {
      return
    }

    if (this.isTilesFormat) {
      // Deduplicate resources before saving, as injected tile fragments might be matched
      // multiple times across different fallback queries (e.g file vs pluginfile nodes)
      const uniqueResourcesMap = new Map<string, Resource>()
      for (const res of this.resources) {
        if (!uniqueResourcesMap.has(res.href)) {
          uniqueResourcesMap.set(res.href, res)
        }
      }
      this.resources = Array.from(uniqueResourcesMap.values())
    }

    if (this.lastModifiedHeaders === undefined) {
      this.lastModifiedHeaders = Object.fromEntries(
        this.resources.map((r) => [r.href, r.lastModified])
      )
    }
  }

  private async processTiles(mainHTML: HTMLElement): Promise<void> {
    const tiles = mainHTML.querySelectorAll<HTMLElement>("a.tile-link")
    if (tiles.length === 0) return

    logger.debug(`Processing ${tiles.length} tiles for dynamic content via AJAX`)

    const sesskey = this.getSesskey()
    const contextId = this.getContextId()

    if (!sesskey || !contextId) {
      logger.warn("Could not find sesskey or contextid, falling back to visual clicks")
      for (const tile of Array.from(tiles)) {
        tile.click()
        await this.sleep(500)
      }
      return
    }

    // Create a hidden container for the fetched content so scanner can find modules
    const hiddenContainer = this.HTMLDocument.createElement("div")
    hiddenContainer.id = "moodle-buddy-tiles-content"
    hiddenContainer.style.display = "none"
    mainHTML.appendChild(hiddenContainer)

    const fetchPromises = Array.from(tiles).map(async (tile) => {
      const url = new URL((tile as HTMLAnchorElement).href)
      const sectionId = url.searchParams.get("id")
      if (!sectionId) return

      try {
        const content = await this.fetchTileContent(sectionId, sesskey, contextId)
        if (content) {
          const wrapper = this.HTMLDocument.createElement("div")
          wrapper.id = `section-${sectionId}`
          const tileContainer = tile.closest(".tile") || tile
          const titleElement = tileContainer.querySelector("h3")
          const title =
            titleElement?.textContent?.trim() || tile.textContent?.trim() || `Section ${sectionId}`
          wrapper.setAttribute("aria-label", title)
          wrapper.innerHTML = content
          hiddenContainer.appendChild(wrapper)
        }
      } catch (e) {
        logger.error(`Failed to fetch tile content for section ${sectionId}`, e)
      }
    })

    await Promise.all(fetchPromises)
    logger.debug("All tiles fetched and injected into hidden container")
  }

  private getSesskey(): string | undefined {
    // Try to get from M.cfg or from a logout link
    const scriptContent = Array.from(this.HTMLDocument.scripts)
      .map((s) => s.textContent)
      .join(" ")
    const match = scriptContent.match(/"sesskey":"([^"]+)"/)
    if (match) return match[1]

    const logoutLink = this.HTMLDocument.querySelector<HTMLAnchorElement>(
      'a[href*="login/logout.php?sesskey="]'
    )
    if (logoutLink) {
      const url = new URL(logoutLink.href)
      return url.searchParams.get("sesskey") ?? undefined
    }

    return undefined
  }

  private getContextId(): string | undefined {
    const scriptContent = Array.from(this.HTMLDocument.scripts)
      .map((s) => s.textContent)
      .join(" ")
    const match = scriptContent.match(/"contextid":(\d+)/)
    if (match) return match[1]

    // Fallback: look for body classes or other indicators
    const bodyClass = this.HTMLDocument.body.className
    const contextMatch = bodyClass.match(/context-(\d+)/)
    if (contextMatch) return contextMatch[1]

    return undefined
  }

  private async fetchTileContent(
    sectionId: string,
    sesskey: string,
    contextId: string
  ): Promise<string | undefined> {
    const baseURL = getMoodleBaseURL(this.link)
    const url = `${baseURL}/lib/ajax/service.php?sesskey=${sesskey}&info=core_get_fragment`

    const payload = [
      {
        index: 0,
        methodname: "core_get_fragment",
        args: {
          component: "format_tiles",
          callback: "get_cm_list",
          contextid: parseInt(contextId),
          args: [
            {
              name: "sectionid",
              value: parseInt(sectionId),
            },
          ],
        },
      },
    ]

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) return undefined

    const data = await response.json()
    return data[0]?.data?.html
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default PageCrawler
