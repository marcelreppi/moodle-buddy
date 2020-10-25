import { getURLRegex } from "./helpers"

export function checkForMoodle() {
  // Check for unique moodle DOM element
  return Boolean(document.querySelector("#region-main"))
}

export function parseCourseNameFromCoursePage(document) {
  const header = document.querySelector(".page-header-headings")
  if (header && header.children.length > 0) {
    return header.children[0].textContent.trim()
  }

  const shortcutNode = document.querySelector("a[aria-current='page']")
  if (shortcutNode) {
    if (shortcutNode.title !== "") {
      return shortcutNode.title.trim()
    }

    if (shortcutNode.textContent !== "") {
      return shortcutNode.textContent.trim()
    }
  }

  const firstHeader = document.querySelector("#region-main").querySelector("h1")
  if (firstHeader) {
    if (firstHeader.textContent !== "") {
      return firstHeader.textContent.trim()
    }
  }

  const firstNavbar = document.querySelector("#page").querySelector("nav")
  if (firstNavbar) {
    const allNavElements = Array.from(firstNavbar.querySelectorAll("li"))
    if (allNavElements.length !== 0) {
      return allNavElements.pop().textContent.trim()
    }
  }

  return "Unknown Course"
}

export function parseCourseShortcut(document) {
  const shortcutNode = document.querySelector("a[aria-current='page']")
  if (shortcutNode) {
    if (shortcutNode.textContent !== "") {
      return shortcutNode.textContent.trim()
    }
  }

  const firstNavbar = document.querySelector("#page").querySelector("nav")
  if (firstNavbar) {
    const allNavElements = Array.from(firstNavbar.querySelectorAll("li"))
    if (allNavElements.length !== 0) {
      return allNavElements.pop().textContent.trim()
    }
  }

  return "Unknown Shortcut"
}

export function parseCourseLink(htmlString) {
  const courseURLRegex = getURLRegex("course")
  const match = htmlString.match(courseURLRegex)
  return match ? match[0] : htmlString
}

export function getQuerySelector(type, options) {
  const baseURL = ""
  const fileSelector = `[href*="${baseURL}/mod/resource"]`
  const folderSelector = `[href*="${baseURL}/mod/folder"]`
  const pluginFileSelector = `[href*="${baseURL}/pluginfile"]:not(.mediafallbacklink)`
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
      // eslint-disable-next-line no-case-declarations
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

export function parseURLFromNode(node, type, options) {
  const aTag = node.querySelector(getQuerySelector(type, options))
  if (aTag) {
    return aTag.href
  }

  if (node.tagName === "A") {
    return node.href
  }

  if (type === "pluginfile") {
    // Videos are also pluginfiles but have a different selector
    const sourceTag = node.querySelector(getQuerySelector("media", options))
    if (sourceTag) {
      return sourceTag.src
    }

    if (node.tagName === "SOURCE" || node.tagName === "IMG") {
      return node.src
    }
  }

  return ""
}

export function parseFileNameFromNode(node) {
  // Files or Folders
  let contentNode = node.querySelector(".instancename")
  if (contentNode) {
    const { firstChild } = contentNode
    if (firstChild && firstChild.textContent !== "") {
      return firstChild.textContent.trim()
    }
  }

  // PluginFiles
  contentNode = node.querySelector(".fp-filename")
  if (contentNode) {
    const { textContent } = contentNode
    if (textContent !== "") {
      return contentNode.textContent.trim()
    }
  }

  if (node.textContent !== "") {
    return node.textContent.trim()
  }

  return "Unknown Filename"
}

export function parseFileNameFromPluginFileURL(url) {
  let fileName = url
    .split("/")
    .pop() // Take last part of URL
    .split("?")
    .shift() // Take everything before query parameters

  fileName = decodeURIComponent(fileName)

  const specialCharacters = {
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

export function parseActivityNameFromNode(node) {
  const contentNode = node.querySelector(".instancename")
  if (contentNode) {
    const { firstChild } = contentNode
    if (firstChild && firstChild.textContent !== "") {
      return firstChild.textContent.trim()
    }
  }

  return "Unknown Activity"
}

export function parseActivityTypeFromNode(node) {
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
    if (firstChild && firstChild.textContent !== "") {
      return firstChild.textContent.trim()
    }
  }

  return "Unkown Activity Type"
}

export function parseSectionName(node) {
  const section = node.closest("[id^='section-']")
  if (section && section.attributes["aria-label"]) {
    return section.attributes["aria-label"].value.trim()
  }

  if (section && section.attributes["aria-labelledby"]) {
    const labelledBy = section.attributes["aria-labelledby"].value
    const label = document.getElementById(labelledBy)
    if (label) {
      return label.textContent.trim()
    }
  }

  return "Unknown Section"
}

export function getDownloadButton(node) {
  return node.querySelector(`form[action$="/mod/folder/download_folder.php"]`)
}

export function getDownloadIdTag(node) {
  return node.querySelector("input[name='id']")
}
