/* eslint-disable no-inner-declarations */
let nDocuments = 0
let nNonDownloadDocuments = 0
let nNewDocuments = 0
let nFolders = 0
let nNonDownloadFolders = 0
let nNewFolders = 0

let resourceNodes = []
let downloadedResources = []

let courseData = {}

// browser.storage.local.clear()
browser.storage.local.get(location.href).then(res => {
  if (res[location.href]) {
    courseData = res[location.href]
  }

  const previousResources = courseData.allResources || []
  const previouslyDownloadedResources = courses.downloadedResources || []

  document
    .querySelector("#region-main")
    .querySelectorAll("a")
    .forEach(node => {
      console.log(node.href)
      if (node.href.match(/https:\/\/.*\/mod\/resource\/view\.php\?id=/gi)) {
        node.isDocument = true
        resourceNodes.push(node)
        nDocuments++

        if (!previousResources.includes(node.href)) {
          nNewDocuments++
          node.isNewResource = true
        } else {
          if (!previouslyDownloadedResources.includes(node.href)) {
            nNonDownloadDocuments++
            node.isNonDownloadResource = true
          }
        }

        return
      }

      if (node.href.match(/https:\/\/.*\/mod\/folder\/view\.php\?id=/gi)) {
        node.isFolder = true
        resourceNodes.push(node)
        nFolders++

        if (!previousResources.includes(node.href)) {
          nNewFolders++
          node.isNewResource = true
        } else {
          if (!previouslyDownloadedResources.includes(node.href)) {
            nNonDownloadFolders++
            node.isNonDownloadResource = true
          }
        }

        return
      }
    })
})

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    browser.runtime.sendMessage({
      command: "scan-result",
      nDocuments,
      nNonDownloadDocuments,
      nNewDocuments,
      nFolders,
      nNonDownloadFolders,
      nNewFolders,
    })
    return
  }

  if (message.command === "crawl") {
    await crawlResources(message)
    return
  }
})

async function crawlResources(message) {
  const courseName = document.querySelector(".page-header-headings").children[0].textContent

  const courseShortcut = document.querySelector("a[aria-current='page']").textContent

  for (let i = 0; i < resourceNodes.length; i++) {
    const node = resourceNodes[i]

    // Skip documents or folders if checkbox was unticked
    if (message.skipDocuments && node.isDocument) continue
    if (message.skipFolders && node.isFolder) continue

    if (message.onlyNewResources) {
      // Skip already downloaded resources
      if (node.isNewResource || node.isNonDownloadResource) {
        continue
      }
    }

    downloadedResources.push(node)

    // Fetch the href to get the actual download URL
    const res = await fetch(node.href)

    if (node.isDocument) {
      // Content script can't access downloads API -> send msg to background script
      browser.runtime.sendMessage({
        command: "download-file",
        url: res.url,
        moodleFilename: node.children[1].firstChild.textContent,
        useMoodleFilename: message.useMoodleFilename,
        courseName: courseName,
        prependCourseToFilename: message.prependCourseToFilename,
        courseShortcut: courseShortcut,
        prependCourseShortcutToFilename: message.prependCourseShortcutToFilename,
      })
      continue
    }

    if (node.isFolder) {
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

        if (downloadIDTag === null) continue

        const downloadURL = `https://${
          window.location.hostname
        }/mod/folder/download_folder.php?id=${downloadIDTag.getAttribute("value")}`
        browser.runtime.sendMessage({
          command: "download-folder",
          url: downloadURL,
          folderName: node.children[1].firstChild.textContent,
          courseName: courseName,
          prependCourseToFilename: message.prependCourseToFilename,
          courseShortcut: courseShortcut,
          prependCourseShortcutToFilename: message.prependCourseShortcutToFilename,
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
            folderName: node.children[1].firstChild.textContent,
            courseName: courseName,
            prependCourseToFilename: message.prependCourseToFilename,
            courseShortcut: courseShortcut,
            prependCourseShortcutToFilename: message.prependCourseShortcutToFilename,
          })
        })
      }
    }
  }

  browser.storage.local.set({
    [location.href]: {
      allResources: resourceNodes.map(n => n.href),
      downloadedResources: downloadedResources.map(n => n.href),
    },
  })
  nNewDocuments = 0
  nNewFolders = 0
}
