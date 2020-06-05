import { getQuerySelector, parseCourseNameFromCoursePage } from "../shared/parser"
import { sendLog } from "../shared/helpers"

const courseName = parseCourseNameFromCoursePage(document)
let videoNodes = []
let videoResources = []
let cancel = false
let error = false

function scanForVideos() {
  try {
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
  } catch (err) {
    console.error(err)
    sendLog({ errorMessage: err.message, url: location.href })
    error = true
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

      function attemptDownload() {
        const videoURLSelector = getQuerySelector("videoservice")
        const videoElement = document.querySelector(videoURLSelector)
        const backButton = document.querySelector("a[href$='browse']")

        if (videoElement === null || backButton === null) {
          setTimeout(attemptDownload, 2000)
          return
        }

        browser.runtime.sendMessage({
          command: "download",
          resources: [{ ...videoResource, href: videoElement.src }],
          courseName,
          courseShortcut: "",
          options,
        })

        backButton.click()
        resolve()
      }

      setTimeout(attemptDownload, 3000)
    }
  })
}

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "scan") {
    scanForVideos()

    browser.runtime.sendMessage({
      command: "page-data",
      page: "videoservice",
      HTMLString: document.querySelector("html").outerHTML,
    })

    if (error) {
      browser.runtime.sendMessage({
        command: "error-view",
      })
      return
    }

    browser.runtime.sendMessage({
      command: "scan-result",
      videoResources,
    })
    return
  }

  if (message.command === "crawl") {
    const { options, selectedResources } = message

    try {
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
    } catch (err) {
      console.error(err)
      sendLog({ errorMessage: err.message, url: location.href })
      error = true
      browser.runtime.sendMessage({
        command: "error-view",
      })
    }
  }

  if (message.command === "cancel-download") {
    browser.runtime.sendMessage({
      command: "cancel-download",
    })
    cancel = true
  }
})
