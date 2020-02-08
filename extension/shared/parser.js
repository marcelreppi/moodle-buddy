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

  return "Unknown"
}

export function parseCourseShortcut(document) {
  const shortcutNode = document.querySelector("a[aria-current='page']")
  if (shortcutNode) {
    return shortcutNode.textContent
  }

  return ""
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

  return ""
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
    return node.querySelector(".instancename").firstChild.textContent
  }

  return ""
}

export function parseActivityTypeFromNode(node) {
  if (node.querySelector(".accesshide")) {
    return node.querySelector(".accesshide").firstChild.textContent.trim()
  }

  return ""
}
