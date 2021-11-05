import { ExtensionOptions } from "types"
import { getURLRegex } from "./regexHelpers"

export function checkForMoodle(): boolean {
  // Check for unique moodle DOM element
  return Boolean(document.querySelector("#region-main"))
}

export function parseCourseShortcut(document: Document): string {
  const shortcutNode = document.querySelector("a[aria-current='page']")
  if (shortcutNode) {
    const { textContent } = shortcutNode
    if (textContent) {
      return textContent.trim()
    }
  }

  const possibleNavbarContainers = document.querySelectorAll("#page, #page-header, #page-navbar")
  if (possibleNavbarContainers) {
    for (const container of Array.from(possibleNavbarContainers)) {
      const navbar = container.querySelector("nav, ol, ul")
      if (navbar) {
        const allNavElements = Array.from(navbar.querySelectorAll("li"))
        const lastNav = allNavElements.pop()
        if (lastNav) {
          const { textContent } = lastNav
          if (textContent) {
            return textContent.trim()
          }
        }
      }
    }
  }

  return "Unknown Shortcut"
}

export function parseCourseNameFromCoursePage(document: Document): string {
  const header = document.querySelector(".page-header-headings")
  if (header && header.children.length > 0) {
    const { textContent } = header.children[0]
    if (textContent) {
      return textContent.trim()
    }
  }

  const shortcutNode = document.querySelector<HTMLAnchorElement>("a[aria-current='page']")
  if (shortcutNode) {
    const { title, textContent } = shortcutNode
    if (title) {
      return title.trim()
    }

    if (textContent) {
      return textContent.trim()
    }
  }

  const mainHTML = document.querySelector("#region-main")
  if (mainHTML) {
    const firstHeader = mainHTML.querySelector("h1")
    if (firstHeader) {
      const { textContent } = firstHeader
      if (textContent) {
        return textContent.trim()
      }
    }
  }

  const possibleTitleContainers = document.querySelectorAll("#page, #page-header, #page-navbar")
  if (possibleTitleContainers) {
    for (const container of Array.from(possibleTitleContainers)) {
      const titleElement = container.querySelector("h1")
      if (titleElement) {
        const { textContent } = titleElement
        if (textContent) {
          return textContent.trim()
        }
      }
    }
  }

  const shortcut = parseCourseShortcut(document)
  if (shortcut !== "" && shortcut !== "Unknown Shortcut") {
    return shortcut
  }

  return "Unknown Course"
}

export function parseCourseLink(htmlString: string): string {
  const courseURLRegex = getURLRegex("course")
  const match = htmlString.match(courseURLRegex)
  return match ? match[0] : htmlString
}

type QuerySelectorTypes =
  | "file"
  | "folder"
  | "pluginfile"
  | "url"
  | "activity"
  | "video"
  | "audio"
  | "image"
  | "media"
  | "videoservice"
export function getQuerySelector(type: QuerySelectorTypes, options: ExtensionOptions): string {
  const baseURL = ""
  const fileSelector = `[href*="${baseURL}/mod/resource"]`
  const folderSelector = `[href*="${baseURL}/mod/folder"]`
  const pluginFileSelector = `[href*="${baseURL}/pluginfile"]:not(.mediafallbacklink)`
  const urlSelector = `[href*="${baseURL}/mod/url"]`
  const videoSelector = `video source[src*="${baseURL}/pluginfile"]`
  const audioSelector = `audio source[src*="${baseURL}/pluginfile"]`
  const imageSelector = `img[src*="${baseURL}/pluginfile"]`
  const videoServiceSelector = `video[src*="${baseURL}/mod/videoservice/file.php"]`
  // Any link with /mod/xxx except /mod/resource and /mod/folder
  const activityQuerySelector = `[href*="${baseURL}/mod/"]:not(${fileSelector}):not(${folderSelector})`

  let selector = null
  switch (type) {
    case "file":
      selector = fileSelector
      break
    case "folder":
      selector = folderSelector
      break
    case "pluginfile":
      selector = pluginFileSelector
      break
    case "url":
      selector = urlSelector
      break
    case "activity":
      selector = activityQuerySelector
      break
    case "video":
      selector = videoSelector
      break
    case "audio":
      selector = audioSelector
      break
    case "image":
      selector = imageSelector
      break
    case "media":
      const mediaSelectors = []
      if (options.includeVideo) {
        mediaSelectors.push(videoSelector)
      }
      if (options.includeAudio) {
        mediaSelectors.push(audioSelector)
      }
      if (options.includeImage) {
        mediaSelectors.push(imageSelector)
      }
      selector = mediaSelectors.join(",") || "pleasedontmatchanything"
      break
    case "videoservice":
      selector = videoServiceSelector
      break
    default:
      break
  }

  selector = `${selector}:not(.helplinkpopup)`
  return selector
}

export function parseURLFromNode(
  node: HTMLElement,
  type: QuerySelectorTypes,
  options: ExtensionOptions
): string {
  const aTag = node.querySelector<HTMLAnchorElement>(getQuerySelector(type, options))
  if (aTag) {
    return aTag.href
  }

  if (node instanceof HTMLAnchorElement) {
    return node.href
  }

  if (type === "pluginfile") {
    // Videos are also pluginfiles but have a different selector
    const mediaTag = node.querySelector(getQuerySelector("media", options))
    if (mediaTag instanceof HTMLSourceElement || mediaTag instanceof HTMLImageElement) {
      return mediaTag.src
    }

    if (node instanceof HTMLSourceElement || node instanceof HTMLImageElement) {
      return node.src
    }
  }

  return ""
}

export function parseFileNameFromNode(node: HTMLElement): string {
  // Files or Folders
  let contentNode = node.querySelector(".instancename")
  if (contentNode) {
    const { firstChild } = contentNode
    if (firstChild) {
      const { textContent } = firstChild
      if (textContent) {
        return textContent.trim()
      }
    }
  }

  // PluginFiles
  contentNode = node.querySelector(".fp-filename")
  if (contentNode) {
    const { textContent } = contentNode
    if (textContent) {
      return textContent.trim()
    }
  }

  const { textContent } = node
  if (textContent) {
    return textContent.trim()
  }

  return "Unknown Filename"
}

export function parseFileNameFromPluginFileURL(url: string): string {
  let fileName = ""
  const urlParts = url.split("/")
  const lastUrlPart = urlParts.pop()
  if (lastUrlPart) {
    // Take everything before hash or query parameters
    const [path] = lastUrlPart.split(/[#?]/)
    fileName = path
  }

  fileName = decodeURIComponent(fileName)

  const specialCharacters: Record<string, string> = {
    "%21": "!",
    "%23": "#",
    "%24": "$",
    "%25": "%",
    "%26": "&",
    "%27": "'",
    "%28": "(",
    "%29": ")",
    "%2A": "*",
    "%2B": "+",
    "%2C": ",",
    "%2F": "/",
    "%3A": ":",
    "%3B": ";",
    "%3D": "=",
    "%3F": "?",
    "%40": "@",
    "%5B": "[",
    "%5D": "]",
  }

  for (const percentChar of Object.keys(specialCharacters)) {
    fileName = fileName.replace(percentChar, specialCharacters[percentChar])
  }

  return fileName
}

export function parseActivityNameFromNode(node: HTMLElement): string {
  const contentNode = node.querySelector(".instancename")
  if (contentNode) {
    const { firstChild } = contentNode
    if (firstChild) {
      const { textContent } = firstChild
      if (textContent) {
        return textContent.trim()
      }
    }
  }

  return "Unknown Activity"
}

export function parseActivityTypeFromNode(node: HTMLElement): string {
  const modtypeClassResult = node.className.match(/modtype.*(?= )/gi)
  if (modtypeClassResult) {
    const activityType = modtypeClassResult[0].split("_")[1]
    if (activityType) {
      return activityType
    }
  }

  const contentNode = node.querySelector(".accesshide")
  if (contentNode) {
    const { firstChild } = contentNode
    if (firstChild) {
      const { textContent } = firstChild
      if (textContent) {
        return textContent.trim()
      }
    }
  }

  return "Unkown Activity Type"
}

export function parseSectionName(node: HTMLElement, document: Document): string {
  const section = node.closest("[id^='section-']")

  if (!section) {
    return ""
  }

  const ariaLabel = section.attributes.getNamedItem("aria-label")
  if (ariaLabel) {
    return ariaLabel.value.trim()
  }

  const ariaLabelledBy = section.attributes.getNamedItem("aria-labelledby")
  if (ariaLabelledBy) {
    const label = document.getElementById(ariaLabelledBy.value)
    if (label) {
      const { textContent } = label
      if (textContent) {
        return textContent.trim()
      }
    }
  }

  const sectionNameElement = section.querySelector(".sectionname")
  if (sectionNameElement) {
    const { textContent } = sectionNameElement
    if (textContent) {
      return textContent.trim()
    }
  }

  if (section.id === "section-0") {
    // Make an exception for section 0
    // Often courses contain general info in there without a section title
    return ""
  }

  return "Unknown Section"
}

export function getDownloadButton(node: HTMLElement): HTMLFormElement | null {
  return node.querySelector<HTMLFormElement>(`form[action$="/mod/folder/download_folder.php"]`)
}

export function getDownloadIdTag(node: HTMLElement): HTMLInputElement | null {
  return node.querySelector<HTMLInputElement>("input[name='id']")
}
