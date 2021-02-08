import { ExtensionOptions, ExtensionStorage } from "extension/types/global.types"
import {
  CancelDownloadMessage,
  CourseCrawlMessage,
  DownloadMessage,
  ErrorViewMessage,
  Message,
  VideoDownloadProgressMessage,
} from "extension/types/messages.types"
import { Resource } from "extension/models/Course.types"
import { getQuerySelector, parseCourseNameFromCoursePage } from "../shared/parser"
import { sendLog } from "../shared/helpers"

const courseName = parseCourseNameFromCoursePage(document)
let videoNodes: HTMLAnchorElement[] = []
let videoResources: Resource[] = []
let cancel = false
let error = false

async function scanForVideos() {
  try {
    videoResources = []
    videoNodes = []

    const { options }: ExtensionStorage = await browser.storage.local.get("options")

    if (location.href.endsWith("view")) {
      const videoURLSelector = getQuerySelector("videoservice", options)
      const videoElement: HTMLVideoElement | null = document.querySelector(videoURLSelector)

      let fileName = ""
      const mainHTML = document.querySelector("#region-main")
      if (mainHTML) {
        const { textContent } = mainHTML
        if (textContent) {
          // eslint-disable-next-line prefer-destructuring
          fileName = textContent
            .split("\n")
            .map(t => t.trim())
            .filter(t => {
              return Boolean(t)
            })[0]
        }
      }

      if (videoElement !== null && fileName !== "") {
        const videoResource: Resource = {
          href: videoElement.src,
          name: fileName,
          section: "",
          isNew: false,
          type: "videoservice",
        }
        videoResources.push(videoResource)
        return
      }
    }

    if (location.href.endsWith("browse")) {
      const videoServiceURLs = document.querySelectorAll<HTMLAnchorElement>(
        "a[href*='videoservice']"
      )

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
        }, [] as HTMLAnchorElement[])

      videoNodes.forEach(n => {
        const videoResource: Resource = {
          href: n.href,
          name: n.textContent ? n.textContent.trim() : "Unknown Video",
          section: "",
          isNew: false,
          type: "videoservice",
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

async function downloadVideoResource(videoResource: Resource, options: ExtensionOptions) {
  return new Promise<void>(resolve => {
    if (location.href.endsWith("view")) {
      browser.runtime.sendMessage<DownloadMessage>({
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
      videoNode?.click()

      function attemptDownload() {
        const videoURLSelector = getQuerySelector("videoservice", options)
        const videoElement = document.querySelector<HTMLVideoElement>(videoURLSelector)
        const backButton = document.querySelector<HTMLAnchorElement>("a[href$='browse']")

        if (videoElement === null || backButton === null) {
          setTimeout(attemptDownload, 2000)
          return
        }

        browser.runtime.sendMessage<DownloadMessage>({
          command: "download",
          resources: [{ ...videoResource, href: videoElement.src }],
          courseName,
          courseShortcut: "",
          options,
        })

        backButton?.click()
        resolve()
      }

      setTimeout(attemptDownload, 3000)
    }
  })
}

// eslint-disable-next-line @typescript-eslint/ban-types
const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message
  if (command === "scan") {
    await scanForVideos()
    console.log(videoNodes, videoResources)

    if (error) {
      browser.runtime.sendMessage<ErrorViewMessage>({
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

  if (command === "crawl") {
    const { options, selectedResources } = message as CourseCrawlMessage

    try {
      for (let i = 0; i < selectedResources.length; i++) {
        const selectedResource = selectedResources[i]
        const videoResource = videoResources.find(r => r.href === selectedResource.href)
        if (videoResource) {
          await downloadVideoResource(videoResource, options)
          browser.runtime.sendMessage<VideoDownloadProgressMessage>({
            command: "video-download-progress",
            completed: i + 1,
            total: selectedResources.length,
          })
          if (cancel) {
            cancel = false
            return
          }
        }
      }
    } catch (err) {
      console.error(err)
      sendLog({ errorMessage: err.message, url: location.href })
      error = true
      browser.runtime.sendMessage<ErrorViewMessage>({
        command: "error-view",
      })
    }
  }

  if (command === "cancel-download") {
    browser.runtime.sendMessage<CancelDownloadMessage>({
      command: "cancel-download",
    })
    cancel = true
  }
}
browser.runtime.onMessage.addListener(messageListener)
