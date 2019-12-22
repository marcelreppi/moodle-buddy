export function parseCourseName(document) {
  return document.querySelector(".page-header-headings").children[0].textContent
}

export function parseCourseShortcut(document) {
  return document.querySelector("a[aria-current='page']").textContent
}

export function parseCourseNameFromCard(cardNode) {
  return cardNode.querySelector(".multiline").innerText
}

export function parseCourseLink(htmlString) {
  return htmlString.match(/http(s)?:\/\/([A-z]*\.)*[A-z]*\/course\/view\.php\?id=[0-9]*/i)[0]
}
