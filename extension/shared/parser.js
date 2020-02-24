import { coursePageRegex } from "./helpers"

export function checkForMoodle() {
  // Check for unique moodle DOM element
  return Boolean(document.querySelector("section#region-main"))
}

export function parseCourseNameFromCoursePage(document) {
  const header = document.querySelector(".page-header-headings")
  if (header && header.children.length > 0) {
    return header.children[0].textContent
  }

  const shortcutNode = document.querySelector("a[aria-current='page']")
  if (shortcutNode) {
    if (shortcutNode.title !== "") {
      return shortcutNode.title
    }

    if (shortcutNode.textContent !== "") {
      return shortcutNode.textContent
    }
  }

  return "Unknown Course"
}

export function parseCourseShortcut(document) {
  const shortcutNode = document.querySelector("a[aria-current='page']")
  if (shortcutNode) {
    if (shortcutNode.textContent !== "") {
      return shortcutNode.textContent
    }
  }

  return "Unknown Shortcut"
}

export function parseCourseNameFromCard(cardNode) {
  return cardNode
    .querySelector(".coursename")
    .innerText.split("\n")
    .pop()
}

export function parseCourseLink(htmlString) {
  const match = htmlString.match(coursePageRegex)
  return match ? match[0] : htmlString
}

export function parseFileNameFromNode(aTag) {
  // Files or Folders
  if (aTag.querySelector(".instancename")) {
    return aTag.querySelector(".instancename").firstChild.textContent
  }

  // PluginFiles
  if (aTag.querySelector(".fp-filename")) {
    return aTag.querySelector(".fp-filename").textContent
  }

  if (aTag.textContent !== "") {
    return aTag.textContent
  }

  return "Unknown Filename"
}

export function parseFileNameFromPluginFileURL(url) {
  const fileName = url
    .split("/")
    .pop() // Take last part of URL
    .split("?")
    .shift() // Take everything before query parameters

  return decodeURI(fileName)
}

export function parseActivityNameFromNode(node) {
  if (node.querySelector(".instancename")) {
    const activityName = node.querySelector(".instancename").firstChild.textContent
    if (activityName !== "") return activityName
  }

  return "Unknown Activity"
}

export function parseActivityTypeFromNode(node) {
  if (node.querySelector(".accesshide")) {
    const activityType = node.querySelector(".accesshide").firstChild.textContent.trim()
    if (activityType !== "") return activityType
  }

  return "Unkown Activity Type"
}
