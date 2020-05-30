import { checkForMoodle, getQuerySelector, parseCourseNameFromCoursePage } from "../shared/parser"

const courseName = parseCourseNameFromCoursePage(document)
let videoNodes = []
let videoResources = []
let cancel = false

function scanForVideos() {
  videoResources = []
  videoNodes = []

  if (location.href.endsWith("view")) {
    const videoURLSelector = getQuerySelector("videoservice")
    const videoElement = document.querySelector(videoURLSelector)

    const fileName = document
      .querySelector("#region-main")
      .textContent.split("\n")
      .map(t => t.trim())
      .filter(t => {
        return Boolean(t)
      })[0]

    const videoResource = {
      href: videoElement.src,
      fileName,
      isVideoServiceVideo: true,
    }
    videoResources.push(videoResource)
    return
  }

  if (location.href.endsWith("browse")) {
    const videoServiceURLs = document.querySelectorAll("a[href*='videoservice']")

    videoNodes = Array.from(videoServiceURLs)
      .filter(n => n.href.endsWith("view"))
      .reduce((nodes, current) => {
        const links = nodes.map(n => n.href)
        if (!links.includes(current.href)) {
          if (current.textContent !== "") {
            nodes.push(current)
          }
        }
        return nodes
      }, [])

    videoNodes.forEach(n => {
      const videoResource = {
        href: n.href,
        fileName: n.textContent.trim(),
        isVideoServiceVideo: true,
      }
      videoResources.push(videoResource)
    })
  }
}

async function downloadVideoResource(videoResource, options) {
  return new Promise((resolve, reject) => {
    if (location.href.endsWith("view")) {
      browser.runtime.sendMessage({
        command: "download",
        resources: [videoResource],
        courseName,
        courseShortcut: "",
        options,
      })
      resolve()
      return
    }

    if (location.href.endsWith("browse")) {
      const videoNode = videoNodes.find(n => n.href === videoResource.href)
      videoNode.click()

      setTimeout(() => {
        const videoURLSelector = getQuerySelector("videoservice")
        const videoElement = document.querySelector(videoURLSelector)
        browser.runtime.sendMessage({
          command: "download",
          resources: [{ ...videoResource, href: videoElement.src }],
          courseName,
          courseShortcut: "",
          options,
        })
        const backButton = document.querySelector("a[href$='browse']")
        backButton.click()
        resolve()
      }, 2000)
    }
  })
}

const isMoodlePage = checkForMoodle()
if (isMoodlePage) {
  setTimeout(() => {
    scanForVideos()
  }, 2000)
}

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    scanForVideos()

    browser.runtime.sendMessage({
      command: "page-data",
      page: "videoservice",
      HTMLString: document.querySelector("html").outerHTML,
    })

    browser.runtime.sendMessage({
      command: "scan-result",
      videoResources,
    })
    return
  }

  if (message.command === "crawl") {
    const { options, selectedResources } = message

    for (let i = 0; i < selectedResources.length; i++) {
      const selectedResource = selectedResources[i]
      const videoResource = videoResources.find(r => r.href === selectedResource.href)
      await downloadVideoResource(videoResource, options)
      browser.runtime.sendMessage({
        command: "download-start-progress",
        completed: i + 1,
        total: selectedResources.length,
      })
      if (cancel) {
        cancel = false
        return
      }
    }
  }

  if (message.command === "cancel-download") {
    cancel = true
  }
})
