export async function scanCourse(courseLink, HTMLDocument) {
  let nDocuments = 0
  let nNewDocuments = 0
  let nFolders = 0
  let nNewFolders = 0

  let resourceNodes = []

  let courseData = {}

  const localStorage = await browser.storage.local.get(courseLink)

  if (localStorage[courseLink]) {
    courseData = localStorage[courseLink]
  }

  const previousResources = courseData.oldResources || []

  HTMLDocument.querySelector("#region-main")
    .querySelectorAll("a")
    .forEach(node => {
      if (
        node.href.match(/http(s)?:\/\/([A-z]*\.)*[A-z]*\/mod\/resource\/view\.php\?id=[0-9]*/gi)
      ) {
        node.isDocument = true
        nDocuments++

        if (!previousResources.includes(node.href)) {
          nNewDocuments++
          node.isNewResource = true
        }

        resourceNodes.push(node)
        return
      }

      if (node.href.match(/http(s)?:\/\/([A-z]*\.)*[A-z]*\/mod\/folder\/view\.php\?id=[0-9]*/gi)) {
        node.isFolder = true
        nFolders++

        if (!previousResources.includes(node.href)) {
          nNewFolders++
          node.isNewResource = true
        }

        resourceNodes.push(node)
        return
      }
    })

  const now = new Date()
  if (localStorage[courseLink]) {
    browser.storage.local.set({
      [courseLink]: {
        ...localStorage[courseLink],
        oldResources: resourceNodes.filter(n => !n.isNewResource).map(n => n.href),
        scanTimestamp: now.getTime(),
      },
    })
  } else {
    // First time this course was scanned
    browser.storage.local.set({
      [courseLink]: {
        oldResources: resourceNodes.map(n => n.href),
        scanTimestamp: now.getTime(),
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

export async function crawlCourse(HTMLNode, courseName, courseShortcut, options = {}) {
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
