export async function scanCourse(courseLink, HTMLDocument) {
  // Variable prep
  let nDocuments = 0
  let nNewDocuments = 0
  let nFolders = 0
  let nNewFolders = 0
  let resourceNodes = []

  //  Local storage data
  let storedCourseData = {}

  const localStorage = await browser.storage.local.get(courseLink)
  if (localStorage[courseLink]) {
    storedCourseData = localStorage[courseLink]
  }

  const previousSeenResources = storedCourseData.seenResources || []
  const previousNewResources = storedCourseData.newResources || []
  const lastDownload = storedCourseData.lastDownload || -1

  // RegEx and other conditionals
  const documentRegex = /http(s)?:\/\/([A-z]*\.)*[A-z]*\/mod\/resource\/view\.php\?id=[0-9]*/gi
  const folderRegex = /http(s)?:\/\/([A-z]*\.)*[A-z]*\/mod\/folder\/view\.php\?id=[0-9]*/gi
  const lastDownloadLimit = 1000 * 60 * 60 * 24 // 1 day

  HTMLDocument.querySelector("#region-main")
    .querySelectorAll("a")
    .forEach(node => {
      node.isDocument = node.href.match(documentRegex)
      node.isFolder = node.href.match(folderRegex)

      if (node.isDocument || node.isFolder) {
        resourceNodes.push(node)
      } else {
        return
      }

      if (node.isDocument) nDocuments++
      if (node.isFolder) nFolders++

      if (!previousSeenResources.includes(node.href)) {
        // Resource was not seen on last scan
        if (previousNewResources.includes(node.href)) {
          // Resource was new at last scan
          if (new Date().getTime() - lastDownloadLimit > lastDownload) {
            // Last download was more than 1 day ago
            // -> Keep on treating resource as new

            if (node.isDocument) nNewDocuments++
            if (node.isFolder) nNewFolders++
            node.isNewResource = true
          } else {
            // Last download for this course through the tool was less than 1 day ago
            // -> Assuming that user must have seen it but actively decided not to downloaded it or download it by other means
            // -> Treat resource as old
          }
        } else {
          // Resource did not exist during last scan
          // -> Resource is completely new
          if (node.isDocument) nNewDocuments++
          if (node.isFolder) nNewFolders++
          node.isNewResource = true
        }
      }
    })

  if (localStorage[courseLink]) {
    browser.storage.local.set({
      [courseLink]: {
        ...localStorage[courseLink],
        seenResources: resourceNodes.filter(n => !n.isNewResource).map(n => n.href),
        newResources: resourceNodes.filter(n => n.isNewResource).map(n => n.href),
        lastScan: new Date().getTime(),
      },
    })
  } else {
    // First time this course was scanned
    browser.storage.local.set({
      [courseLink]: {
        seenResources: resourceNodes.map(n => n.href),
        newResources: [],
        lastScan: new Date().getTime(),
      },
    })
  }

  return {
    resourceNodes,
    resourceCounts: {
      nDocuments,
      nNewDocuments,
      nFolders,
      nNewFolders,
    },
  }
}

export async function downloadResource(HTMLNode, courseName, courseShortcut, options = {}) {
  // Fetch the href to get the actual download URL
  const res = await fetch(HTMLNode.href)

  if (HTMLNode.isDocument) {
    // Content script can't access downloads API -> send msg to background script
    browser.runtime.sendMessage({
      command: "download-file",
      url: res.url,
      moodleFilename: HTMLNode.children[1].firstChild.textContent,
      useMoodleFilename: options.useMoodleFilename,
      courseName: courseName,
      prependCourseToFilename: options.prependCourseToFilename,
      courseShortcut: courseShortcut,
      prependCourseShortcutToFilename: options.prependCourseShortcutToFilename,
    })
    return
  }

  if (HTMLNode.isFolder) {
    const body = await res.text()
    const parser = new DOMParser()
    const resHTML = parser.parseFromString(body, "text/html")

    // Two options here
    // 1. "Download Folder" button is shown --> Download zip via button
    // 2. "Download Folder" button is hidden --> Download all files seperately

    const downloadButtonVisible =
      resHTML.querySelector(
        `form[action="https://${window.location.hostname}/mod/folder/download_folder.php"]`
      ) !== null

    if (downloadButtonVisible) {
      const downloadIDTag = resHTML.querySelector("input[name='id']")

      if (downloadIDTag === null) return

      const downloadURL = `https://${
        window.location.hostname
      }/mod/folder/download_folder.php?id=${downloadIDTag.getAttribute("value")}`
      browser.runtime.sendMessage({
        command: "download-folder",
        url: downloadURL,
        folderName: HTMLNode.children[1].firstChild.textContent,
        courseName: courseName,
        prependCourseToFilename: options.prependCourseToFilename,
        courseShortcut: courseShortcut,
        prependCourseShortcutToFilename: options.prependCourseShortcutToFilename,
      })
    } else {
      const fileNodes = resHTML.querySelectorAll("a[href$='forcedownload=1'") // All a tags whose href attribute ends with forcedownload=1
      fileNodes.forEach(fileNode => {
        const filename = fileNode.href
          .split("/")
          .pop()
          .split("?")[0]
        browser.runtime.sendMessage({
          command: "download-folder-file",
          url: fileNode.href,
          filename: filename,
          folderName: HTMLNode.children[1].firstChild.textContent,
          courseName: courseName,
          prependCourseToFilename: options.prependCourseToFilename,
          courseShortcut: courseShortcut,
          prependCourseShortcutToFilename: options.prependCourseShortcutToFilename,
        })
      })
    }
  }
}
