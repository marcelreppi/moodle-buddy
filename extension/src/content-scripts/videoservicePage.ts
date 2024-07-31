import {
  DownloadProgressMessage,
  ExtensionOptions,
  ExtensionStorage,
  CourseCrawlMessage,
  DownloadMessage,
  Message,
  VideoScanResultMessage,
  VideoServiceResource,
} from "types"

import { getQuerySelector, parseCourseNameFromCoursePage } from "@shared/parser"
import { sendLog } from "@shared/helpers"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

const courseName = parseCourseNameFromCoursePage(document)
let videoNodes: HTMLAnchorElement[] = []
let videoResources: VideoServiceResource[] = []
let cancel = false
let error = false

async function scanForVideos() {
  try {
    videoResources = []
    videoNodes = []

    const { options } = (await chrome.storage.local.get("options")) as ExtensionStorage

    if (location.href.endsWith("view")) {
      const videoURLSelector = getQuerySelector("videoservice", options)
      const videoElement: HTMLVideoElement | null = document.querySelector(videoURLSelector)

      let fileName = ""
      const mainHTML = document.querySelector("#region-main")
      if (mainHTML) {
        const { textContent } = mainHTML
        if (textContent) {
          fileName = textContent
            .split("\n")
            .map((t) => t.trim())
            .filter((t) => {
              return Boolean(t)
            })[0]
        }
      }

      if (videoElement !== null && fileName !== "") {
        const videoResource: VideoServiceResource = {
          href: videoElement.src,
          src: videoElement.src,
          name: fileName,
          section: "",
          isNew: false,
          isUpdated: false,
          type: "videoservice",
          resourceIndex: 1,
          sectionIndex: 1,
        }
        videoResources.push(videoResource)
        return
      }
    }

    if (location.href.endsWith("browse")) {
      const videoServiceURLs =
        document.querySelectorAll<HTMLAnchorElement>("a[href*='videoservice']")

      videoNodes = Array.from(videoServiceURLs)
        .filter((n) => n.href.endsWith("view"))
        .reduce((nodes, current) => {
          const links = nodes.map((n) => n.href)
          if (!links.includes(current.href)) {
            if (current.textContent !== "") {
              nodes.push(current)
            }
          }
          return nodes
        }, [] as HTMLAnchorElement[])

      videoNodes.forEach((n, i) => {
        const videoResource: VideoServiceResource = {
          href: n.href,
          src: "",
          name: n.textContent ? n.textContent.trim() : "Unknown Video",
          section: "",
          isNew: false,
          isUpdated: false,
          type: "videoservice",
          resourceIndex: i + 1,
          sectionIndex: 1,
        }
        videoResources.push(videoResource)
      })
    }
  } catch (err) {
    logger.error(err)
    sendLog({ errorMessage: err.message, url: location.href, page: "videoservice" })
    error = true
  }
}

async function getVideoResourceSrc(
  videoResource: VideoServiceResource,
  options: ExtensionOptions
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const videoNode = videoNodes.find((n) => n.href === videoResource.href)
    if (videoNode) {
      videoNode?.click()

      function attemptSrcParsing() {
        const videoURLSelector = getQuerySelector("videoservice", options)
        const videoElement = document.querySelector<HTMLVideoElement>(videoURLSelector)
        const backButton = document.querySelector<HTMLAnchorElement>("a[href$='browse']")

        if (videoElement === null || backButton === null) {
          setTimeout(attemptSrcParsing, 2000)
          return
        }

        backButton?.click()
        resolve(videoElement.src)
      }

      setTimeout(attemptSrcParsing, 3000)
    } else {
      reject()
    }
  })
}

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message
  if (command === COMMANDS.INIT_SCAN) {
    await scanForVideos()

    if (error) {
      chrome.runtime.sendMessage({
        command: COMMANDS.ERROR_VIEW,
      } satisfies Message)
      return
    }

    chrome.runtime.sendMessage({
      command: COMMANDS.SCAN_RESULT,
      videoResources,
    } satisfies VideoScanResultMessage)
    return
  }

  if (command === COMMANDS.COURSE_CRAWL) {
    const { options, selectedResources } = message as CourseCrawlMessage

    const id = Date.now().toString()
    try {
      if (location.href.endsWith("view")) {
        // A single video is being diplayed
        await chrome.runtime.sendMessage({
          command: COMMANDS.DOWNLOAD,
          id,
          courseLink: "",
          courseName,
          courseShortcut: "",
          resources: videoResources,
          options,
        } satisfies DownloadMessage)
        await chrome.runtime.sendMessage({
          command: COMMANDS.DOWNLOAD_PROGRESS,
          id,
          courseLink: "",
          courseName,
          completed: videoResources.length,
          total: selectedResources.length,
          errors: 0,
          isDone: true,
        } satisfies DownloadProgressMessage)
      } else if (location.href.endsWith("browse")) {
        // A list of videos is being displayed
        const downloadVideoResources: VideoServiceResource[] = []
        for (let i = 0; i < selectedResources.length; i++) {
          const selectedResource = selectedResources[i]
          const videoResource = videoResources.find((r) => r.href === selectedResource.href)
          if (videoResource) {
            videoResource.src = await getVideoResourceSrc(
              videoResource,
              options as ExtensionOptions
            )
            const completed = i + 1
            chrome.runtime.sendMessage({
              command: COMMANDS.DOWNLOAD_PROGRESS,
              id,
              courseLink: "",
              courseName,
              completed,
              total: selectedResources.length,
              errors: 0,
              isDone: completed === selectedResources.length,
            } satisfies DownloadProgressMessage)
            downloadVideoResources.push(videoResource)

            if (cancel) {
              cancel = false
              return
            }
          }
        }

        chrome.runtime.sendMessage({
          command: COMMANDS.DOWNLOAD,
          id,
          courseLink: "",
          courseName,
          courseShortcut: "",
          resources: downloadVideoResources,
          options,
        } satisfies DownloadMessage)
      }
    } catch (err) {
      logger.error(err)
      sendLog({ errorMessage: err.message, url: location.href, page: "videoservice" })
      error = true
      chrome.runtime.sendMessage({
        command: COMMANDS.ERROR_VIEW,
      } satisfies Message)
    }
  }

  if (command === COMMANDS.CANCEL_DOWNLOAD) {
    chrome.runtime.sendMessage({
      command: COMMANDS.CANCEL_DOWNLOAD,
    } satisfies Message)
    cancel = true
  }
})
