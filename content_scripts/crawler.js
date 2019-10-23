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
    document.querySelectorAll("a").forEach(node => {
      // Skip repeating link to a document
      if (node.children.length > 0) return

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

    console.log(resourceNodes.map(n => n.href))

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
