import { validURLRegex } from "../shared/helpers.js"

export function parseCourseNameFromCoursePage(document) {
  return document.querySelector(".page-header-headings").children[0].textContent
}

export function parseCourseShortcut(document) {
  return document.querySelector("a[aria-current='page']").textContent
}

export function parseCourseNameFromCard(cardNode) {
  return cardNode
    .querySelector(".coursename")
    .innerText.split("\n")
    .pop()
}

export function parseCourseLink(htmlString) {
  return htmlString.match(
    new RegExp(validURLRegex + /\/course\/view\.php\?id=[0-9]*/.source, "i")
  )[0]
}

export function parseFilenameFromCourse(aTag) {
  // Files or Folders
  if (aTag.querySelector(".instancename")) {
    return aTag.querySelector(".instancename").firstChild.textContent
  }

  // Pluginfiles
  if (aTag.querySelector(".fp-filename")) {
    return aTag.querySelector(".fp-filename").textContent
  }
}

export function parseFilenameFromPluginfileURL(url) {
  return url
    .split("/")
    .pop() // Take last part of URL
    .split("?")
    .shift() // Take everything before query parameters
}
