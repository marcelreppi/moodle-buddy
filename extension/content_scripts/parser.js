import { coursePageRegex } from "../shared/helpers"

export function parseCourseNameFromCoursePage(document) {
  return document.querySelector(".page-header-headings").children[0].textContent
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
  return htmlString.match(coursePageRegex)[0]
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
