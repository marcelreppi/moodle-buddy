import { validURLRegex } from "../shared/helpers"
import { parseFilenameFromCourse, parseFilenameFromPluginfileURL, isActivityNode } from "./parser"

const fileRegex = new RegExp(validURLRegex + /\/mod\/resource\/view\.php\?id=[0-9]*/.source, "gi")

const folderRegex = new RegExp(validURLRegex + /\/mod\/folder\/view\.php\?id=[0-9]*/.source, "gi")

const pluginfileRegex = new RegExp(
  validURLRegex + /\/pluginfile\.php([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.source,
  "gi"
)

const specialResourceViewRegex = new RegExp(
  validURLRegex + /\/mod\/resource\/view\.php\?id=[0-9]*/.source,
  "i"
)

export async function scanCourse(courseLink, HTMLDocument) {
  // Variable prep
  let nFiles = 0
  let nNewFiles = 0
  let nFolders = 0
  let nNewFolders = 0
  let nActivities = 0
  let nNewActivities = 0
  const activityNodes = []
  const resourceNodes = []
  let isFirstScan = true

  //  Local storage data
  let storedCourseData = {}

  const localStorage = await browser.storage.local.get(courseLink)

  if (localStorage[courseLink]) {
    isFirstScan = false
    storedCourseData = localStorage[courseLink]
  }

  const previousSeenResources = storedCourseData.seenResources || null
  const previousSeenActivities = storedCourseData.seenActivities || null

  HTMLDocument.querySelector("#region-main")
    .querySelectorAll("a")
    .forEach(node => {
      node.mb_isFile =
        Boolean(node.href.match(fileRegex)) || Boolean(node.href.match(pluginfileRegex))
      node.mb_isFolder = Boolean(node.href.match(folderRegex))
      node.mb_isPluginfile = Boolean(node.href.match(pluginfileRegex))

      if (node.mb_isFile || node.mb_isFolder) {
        resourceNodes.push(node)
      } else {
        if (isActivityNode(node)) {
          nActivities++
          node.mb_isActivity = true
          activityNodes.push(node)

          if (previousSeenActivities === null || previousSeenActivities.includes(node.href)) {
            node.mb_isNewActivity = false
          } else {
            nNewActivities++
            node.mb_isNewActivity = true
          }
        }
        return
      }

      if (node.mb_isFile) nFiles++
      if (node.mb_isFolder) nFolders++

      if (previousSeenResources === null || previousSeenResources.includes(node.href)) {
        // If course has never been scanned previousSeenResources don't exist
        // Never treat a resource as new when the course is scanned for the first time
        // because we're capturing the initial state of the course
        node.mb_isNewResource = false
      } else {
        if (node.mb_isFile) nNewFiles++
        if (node.mb_isFolder) nNewFolders++
        node.mb_isNewResource = true
      }

      if (node.mb_isPluginfile) {
        node.mb_filename = parseFilenameFromPluginfileURL(node.href)
      } else {
        node.mb_filename = parseFilenameFromCourse(node)
      }
    })

  if (localStorage[courseLink]) {
    await browser.storage.local.set({
      [courseLink]: {
        ...localStorage[courseLink],
        seenResources: resourceNodes.filter(n => !n.mb_isNewResource).map(n => n.href),
        newResources: resourceNodes.filter(n => n.mb_isNewResource).map(n => n.href),
        seenActivities: activityNodes.filter(n => !n.mb_isNewActivity).map(n => n.href),
        newActivities: activityNodes.filter(n => n.mb_isNewActivity).map(n => n.href),
      },
    })
  } else {
    // First time this course was scanned
    await browser.storage.local.set({
      [courseLink]: {
        seenResources: resourceNodes.filter(n => !n.mb_isNewResource).map(n => n.href),
        newResources: resourceNodes.filter(n => n.mb_isNewResource).map(n => n.href),
        seenActivities: activityNodes.filter(n => !n.mb_isNewActivity).map(n => n.href),
        newActivities: activityNodes.filter(n => n.mb_isNewActivity).map(n => n.href),
      },
    })
  }

  if (nNewFiles + nNewFolders > 0) {
    browser.runtime.sendMessage({
      command: "set-icon-new",
    })
  }

  return {
    resourceNodes,
    resourceCounts: {
      nFiles,
      nNewFiles,
      nFolders,
      nNewFolders,
      nActivities,
      nNewActivities,
    },
    isFirstScan,
  }
}

export async function updateCourseResources(courseLink, downloadedResourceNodes) {
  const localStorage = await browser.storage.local.get()
  const storedCourseData = localStorage[courseLink]

  // Default behavior: Merge stored new resources
  let newSeenResources = storedCourseData.newResources

  // If downloaded resources are provided then only merge those
  if (downloadedResourceNodes) {
    newSeenResources = downloadedResourceNodes.map(n => n.href)
  }

  // Merge already seen resources with new resources
  // Use set to remove duplicates
  const updatedSeenResources = Array.from(
    new Set(storedCourseData.seenResources.concat(newSeenResources))
  )
  const updatedNewResources = storedCourseData.newResources.filter(
    r => !updatedSeenResources.includes(r)
  )

  if (updatedNewResources.length > 0) {
    browser.runtime.sendMessage({
      command: "set-icon-new",
    })
  }

  const updatedCourseData = {
    ...storedCourseData,
    seenResources: updatedSeenResources,
    newResources: updatedNewResources,
  }

  await browser.storage.local.set({
    [courseLink]: updatedCourseData,
  })

  return updatedCourseData
}

export async function downloadResource(HTMLNode, courseName, courseShortcut, options) {
  if (HTMLNode.mb_isPluginfile) {
    browser.runtime.sendMessage({
      command: "download-file",
      url: HTMLNode.href,
      filename: parseFilenameFromPluginfileURL(HTMLNode.href),
      moodleFilename: parseFilenameFromPluginfileURL(HTMLNode.href),
      courseName,
      courseShortcut,
      ...options,
    })
    return
  }

  // Fetch the href to get the actual download URL
  const res = await fetch(HTMLNode.href)

  if (res.url.match(specialResourceViewRegex)) {
    const body = await res.text()
    const parser = new DOMParser()
    const resHTML = parser.parseFromString(body, "text/html")
    const mainRegionHTML = resHTML.querySelector("#region-main").innerHTML
    const link = mainRegionHTML.match(pluginfileRegex)[0]

    browser.runtime.sendMessage({
      command: "download-file",
      url: link,
      filename: parseFilenameFromPluginfileURL(link),
      moodleFilename: parseFilenameFromPluginfileURL(link),
      courseName,
      courseShortcut,
      ...options,
    })

    return
  }

  if (HTMLNode.mb_isFile) {
    // Content script can't access downloads API -> send msg to background script
    browser.runtime.sendMessage({
      command: "download-file",
      url: res.url,
      filename: parseFilenameFromPluginfileURL(res.url),
      moodleFilename: parseFilenameFromCourse(HTMLNode),
      courseName,
      courseShortcut,
      ...options,
    })
    return
  }

  if (HTMLNode.mb_isFolder) {
    const body = await res.text()
    const parser = new DOMParser()
    const resHTML = parser.parseFromString(body, "text/html")

    // Two options here
    // 1. "Download Folder" button is shown --> Download zip via button
    // 2. "Download Folder" button is hidden --> Download all files separately

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
        folderName: parseFilenameFromCourse(HTMLNode),
        courseName,
        courseShortcut,
        ...options,
      })
    } else {
      const fileNodes = resHTML.querySelectorAll("a[href$='forcedownload=1'") // All a tags whose href attribute ends with forcedownload=1
      fileNodes.forEach(fileNode => {
        browser.runtime.sendMessage({
          command: "download-folder-file",
          url: fileNode.href,
          filename: parseFilenameFromPluginfileURL(fileNode.href),
          folderName: parseFilenameFromCourse(HTMLNode),
          courseName,
          courseShortcut,
          ...options,
        })
      })
    }
  }
}
