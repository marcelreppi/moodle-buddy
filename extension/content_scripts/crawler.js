import {
  parseFileNameFromNode,
  parseFileNameFromPluginFileURL,
  parseActivityNameFromNode,
  parseActivityTypeFromNode,
} from "../shared/parser"

const urlQuerySelector = location.hostname.replace(/\./g, "\\.")
const fileQuerySelector = `[href*=${urlQuerySelector}\\/mod\\/resource]`
const folderQuerySelector = `[href*=${urlQuerySelector}\\/mod\\/folder]`
const pluginFileQuerySelector = `[href*=${urlQuerySelector}\\/pluginfile]`
// Any link with /mod/xxx except /mod/resource and /mod/folder
const activityQuerySelector = `[href*=${urlQuerySelector}\\/mod\\/]:not(${fileQuerySelector}):not(${folderQuerySelector})`

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

  const mainHTML = HTMLDocument.querySelector("#region-main")
  const fileNodes = mainHTML.querySelectorAll(fileQuerySelector)
  const pluginFileNodes = mainHTML.querySelectorAll(pluginFileQuerySelector)
  const folderNodes = mainHTML.querySelectorAll(folderQuerySelector)
  const actNodes = mainHTML.querySelectorAll(activityQuerySelector)

  // console.log(fileNodes)
  // console.log(folderNodes)
  // console.log(pluginFileNodes)
  // console.log(actNodes)

  nFiles += fileNodes.length
  fileNodes.forEach(node => {
    const resourceNode = {
      href: node.href,
      isFile: true,
      isPluginFile: false,
      fileName: parseFileNameFromNode(node),
      isNewResource: null,
    }

    if (previousSeenResources === null || previousSeenResources.includes(node.href)) {
      // If course has never been scanned previousSeenResources don't exist
      // Never treat a resource as new when the course is scanned for the first time
      // because we're capturing the initial state of the course
      resourceNode.isNewResource = false
    } else {
      nNewFiles++
      resourceNode.isNewResource = true
    }

    resourceNodes.push(resourceNode)
  })

  nFiles += pluginFileNodes.length
  pluginFileNodes.forEach(node => {
    const resourceNode = {
      href: node.href,
      isFile: true,
      isPluginFile: true,
      fileName: parseFileNameFromPluginFileURL(node.href),
      isNewResource: null,
    }

    if (previousSeenResources === null || previousSeenResources.includes(node.href)) {
      resourceNode.isNewResource = false
    } else {
      nNewFiles++
      resourceNode.isNewResource = true
    }

    resourceNodes.push(resourceNode)
  })

  nFolders += folderNodes.length
  folderNodes.forEach(node => {
    const resourceNode = {
      href: node.href,
      isFolder: true,
      folderName: parseFileNameFromNode(node),
      isNewResource: null,
    }

    if (previousSeenResources === null || previousSeenResources.includes(node.href)) {
      resourceNode.isNewResource = false
    } else {
      nNewFolders++
      resourceNode.isNewResource = true
    }

    resourceNodes.push(resourceNode)
  })

  nActivities += actNodes.length
  actNodes.forEach(node => {
    const activityNode = {
      href: node.href,
      isActivity: true,
      activityName: parseActivityNameFromNode(node),
      activityType: parseActivityTypeFromNode(node),
      isNewActivity: null,
    }

    if (previousSeenActivities === null || previousSeenActivities.includes(node.href)) {
      activityNode.isNewActivity = false
    } else {
      nNewActivities++
      activityNode.isNewActivity = true
    }

    activityNodes.push(activityNode)
  })

  if (localStorage[courseLink]) {
    await browser.storage.local.set({
      [courseLink]: {
        ...localStorage[courseLink],
        seenResources: resourceNodes.filter(n => !n.isNewResource).map(n => n.href),
        newResources: resourceNodes.filter(n => n.isNewResource).map(n => n.href),
        seenActivities: activityNodes.filter(n => !n.isNewActivity).map(n => n.href),
        newActivities: activityNodes.filter(n => n.isNewActivity).map(n => n.href),
      },
    })
  } else {
    // First time this course was scanned
    await browser.storage.local.set({
      [courseLink]: {
        seenResources: resourceNodes.filter(n => !n.isNewResource).map(n => n.href),
        newResources: resourceNodes.filter(n => n.isNewResource).map(n => n.href),
        seenActivities: activityNodes.filter(n => !n.isNewActivity).map(n => n.href),
        newActivities: activityNodes.filter(n => n.isNewActivity).map(n => n.href),
      },
    })
  }

  if (nNewFiles + nNewFolders + nNewActivities > 0) {
    browser.runtime.sendMessage({
      command: "set-icon",
      iconType: "new",
    })
  }

  return {
    resourceNodes,
    resourceCounts: {
      nFiles,
      nNewFiles,
      nFolders,
      nNewFolders,
    },
    activityNodes,
    activityCounts: {
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
      command: "set-icon",
      iconType: "new",
    })
  } else {
    browser.runtime.sendMessage({
      command: "set-icon",
      iconType: "normal",
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

export async function updateCourseActivities(courseLink) {
  const localStorage = await browser.storage.local.get()
  const storedCourseData = localStorage[courseLink]

  const updatedSeenActivities = Array.from(
    new Set(storedCourseData.seenActivities.concat(storedCourseData.newActivities))
  )
  const updatedNewActivities = []

  if (storedCourseData.newResources.length > 0) {
    browser.runtime.sendMessage({
      command: "set-icon",
      iconType: "new",
    })
  } else {
    browser.runtime.sendMessage({
      command: "set-icon",
      iconType: "normal",
    })
  }

  const updatedCourseData = {
    ...storedCourseData,
    seenActivities: updatedSeenActivities,
    newActivities: updatedNewActivities,
  }

  await browser.storage.local.set({
    [courseLink]: updatedCourseData,
  })

  return updatedCourseData
}
