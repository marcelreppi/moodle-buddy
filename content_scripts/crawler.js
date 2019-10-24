/* eslint-disable no-inner-declarations */

if (!window.scriptHasRun) {
  // Make sure script only runs once!
  window.scriptHasRun = true

  const sanitizeFilename = (filename, connectingString = "") => {
    return filename.trim().replace(/\\|\/|:|\*|\?|"|<|>|\|/gi, connectingString)
  }

  function scanForResources(message) {
    let nDocuments = 0
    let nFolders = 0
    resourceNodes = []
    document
      .querySelector("#region-main")
      .querySelectorAll("a")
      .forEach(node => {
        if (node.href.match(/https:\/\/.*\/mod\/resource\/view\.php\?id=/gi)) {
          node.isDocument = true
          resourceNodes.push(node)
          nDocuments++
          return
        }

        if (node.href.match(/https:\/\/.*\/mod\/folder\/view\.php\?id=/gi)) {
          node.isFolder = true
          resourceNodes.push(node)
          nFolders++
          return
        }
      })

    browser.runtime.sendMessage({
      command: "scan-result",
      numberOfResources: resourceNodes.length,
      nDocuments,
      nFolders,
    })
  }

  async function crawlResources(message) {
    const courseName = sanitizeFilename(
      document.querySelector(".page-header-headings").children[0].textContent
    )

    const courseShortcut = sanitizeFilename(
      document.querySelector("a[aria-current='page']").textContent,
      "_"
    )

    for (let i = 0; i < resourceNodes.length; i++) {
      const node = resourceNodes[i]

      if (message.skipDocuments && node.isDocument) continue
      if (message.skipFolders && node.isFolder) continue

      // Fetch the href to get the actual download URL
      const res = await fetch(node.href)

      if (node.isDocument) {
        // Content script can't access downloads API -> send msg to background script
        browser.runtime.sendMessage({
          command: "download",
          url: res.url,
          moodleFilename: sanitizeFilename(node.children[1].firstChild.textContent),
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
            folderName: sanitizeFilename(node.children[1].firstChild.textContent),
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
              filename: sanitizeFilename(filename),
              folderName: sanitizeFilename(node.children[1].firstChild.textContent),
              courseName: courseName,
              prependCourseToFilename: message.prependCourseToFilename,
              courseShortcut: courseShortcut,
              prependCourseShortcutToFilename: message.prependCourseShortcutToFilename,
            })
          })
        }
      }
    }
  }

  let resourceNodes = []

  browser.runtime.onMessage.addListener(async message => {
    if (message.command === "scan") {
      scanForResources(message)
      return
    }

    if (message.command === "crawl") {
      await crawlResources(message)
      return
    }
  })
}
