import * as parser from "../shared/parser"

function getQuerySelector(type) {
  const urlQuerySelector = "" // location.hostname.replace(/\./g, "\\.")
  const fileQuerySelector = `[href*=${urlQuerySelector}\\/mod\\/resource]`
  const folderQuerySelector = `[href*=${urlQuerySelector}\\/mod\\/folder]`
  const pluginFileQuerySelector = `[href*=${urlQuerySelector}\\/pluginfile]`
  // Any link with /mod/xxx except /mod/resource and /mod/folder
  const activityQuerySelector = `[href*=${urlQuerySelector}\\/mod\\/]:not(${fileQuerySelector}):not(${folderQuerySelector})`
  const videoSelector = `video source[src*=${urlQuerySelector}\\/pluginfile]`

  let selector = null
  switch (type) {
    case "file":
      selector = fileQuerySelector
      break
    case "folder":
      selector = folderQuerySelector
      break
    case "pluginfile":
      selector = pluginFileQuerySelector
      break
    case "activity":
      selector = activityQuerySelector
      break
    case "video":
      selector = videoSelector
      break
    default:
      break
  }

  selector = `${selector}:not(.helplinkpopup)`
  return selector
}

function Course(link, HTMLDocument) {
  this.name = parser.parseCourseNameFromCoursePage(HTMLDocument)
  this.shortcut = parser.parseCourseShortcut(HTMLDocument)
  this.link = link
  this.HTMLDocument = HTMLDocument
  this.isFirstScan = true

  this.resourceNodes = []
  this.resourceCounts = {
    nFiles: 0,
    nNewFiles: 0,
    nFolders: 0,
    nNewFolders: 0,
  }
  this.activityNodes = []
  this.activityCounts = {
    nActivities: 0,
    nNewActivities: 0,
  }

  this.scan = async function() {
    this.resourceNodes = []
    this.resourceCounts = {
      nFiles: 0,
      nNewFiles: 0,
      nFolders: 0,
      nNewFolders: 0,
    }
    this.activityNodes = []
    this.activityCounts = {
      nActivities: 0,
      nNewActivities: 0,
    }

    //  Local storage data
    let storedCourseData = {}

    const localStorage = await browser.storage.local.get(this.link)

    if (localStorage[this.link]) {
      this.isFirstScan = false
      storedCourseData = localStorage[this.link]
    }

    const {
      seenResources: previousSeenResources = null,
      seenActivities: previousSeenActivities = null,
    } = storedCourseData

    const mainHTML = this.HTMLDocument.querySelector("#region-main")
    const fileNodes = mainHTML.querySelectorAll(getQuerySelector("file"))
    const pluginFileNodes = mainHTML.querySelectorAll(getQuerySelector("pluginfile"))
    const videoNodes = mainHTML.querySelectorAll(getQuerySelector("video"))
    const folderNodes = mainHTML.querySelectorAll(getQuerySelector("folder"))
    const activityNodes = mainHTML.querySelectorAll(getQuerySelector("activity"))

    // console.log(fileNodes)
    // console.log(folderNodes)
    // console.log(pluginFileNodes)
    // console.log(actNodes)
    // console.log(videoNodes)

    this.resourceCounts.nFiles += fileNodes.length
    fileNodes.forEach(node => {
      const resourceNode = {
        href: node.href,
        isFile: true,
        isPluginFile: false,
        fileName: parser.parseFileNameFromNode(node),
        isNewResource: null,
      }

      if (previousSeenResources === null || previousSeenResources.includes(node.href)) {
        // If course has never been scanned previousSeenResources don't exist
        // Never treat a resource as new when the course is scanned for the first time
        // because we're capturing the initial state of the course
        resourceNode.isNewResource = false
      } else {
        this.resourceCounts.nNewFiles++
        resourceNode.isNewResource = true
      }

      this.resourceNodes.push(resourceNode)
    })

    this.resourceCounts.nFiles += pluginFileNodes.length
    pluginFileNodes.forEach(node => {
      const resourceNode = {
        href: node.href,
        isFile: true,
        isPluginFile: true,
        fileName: parser.parseFileNameFromPluginFileURL(node.href),
        isNewResource: null,
      }

      if (previousSeenResources === null || previousSeenResources.includes(node.href)) {
        resourceNode.isNewResource = false
      } else {
        this.resourceCounts.nNewFiles++
        resourceNode.isNewResource = true
      }

      this.resourceNodes.push(resourceNode)
    })

    this.resourceCounts.nFiles += videoNodes.length
    videoNodes.forEach(node => {
      const resourceNode = {
        href: node.src,
        isFile: true,
        isPluginFile: true,
        fileName: parser.parseFileNameFromPluginFileURL(node.src),
        isNewResource: null,
      }

      if (previousSeenResources === null || previousSeenResources.includes(node.src)) {
        resourceNode.isNewResource = false
      } else {
        this.resourceCounts.nNewFiles++
        resourceNode.isNewResource = true
      }

      this.resourceNodes.push(resourceNode)
    })

    this.resourceCounts.nFolders += folderNodes.length
    folderNodes.forEach(node => {
      const resourceNode = {
        href: node.href,
        isFolder: true,
        folderName: parser.parseFileNameFromNode(node),
        isNewResource: null,
      }

      if (previousSeenResources === null || previousSeenResources.includes(node.href)) {
        resourceNode.isNewResource = false
      } else {
        this.resourceCounts.nNewFolders++
        resourceNode.isNewResource = true
      }

      this.resourceNodes.push(resourceNode)
    })

    this.activityCounts.nActivities += activityNodes.length
    activityNodes.forEach(node => {
      const activityNode = {
        href: node.href,
        isActivity: true,
        activityName: parser.parseActivityNameFromNode(node),
        activityType: parser.parseActivityTypeFromNode(node),
        isNewActivity: null,
      }

      if (previousSeenActivities === null || previousSeenActivities.includes(node.href)) {
        activityNode.isNewActivity = false
      } else {
        this.activityCounts.nNewActivities++
        activityNode.isNewActivity = true
      }

      this.activityNodes.push(activityNode)
    })

    if (localStorage[this.link]) {
      await browser.storage.local.set({
        [this.link]: {
          ...localStorage[this.link],
          seenResources: this.resourceNodes.filter(n => !n.isNewResource).map(n => n.href),
          newResources: this.resourceNodes.filter(n => n.isNewResource).map(n => n.href),
          seenActivities: this.activityNodes.filter(n => !n.isNewActivity).map(n => n.href),
          newActivities: this.activityNodes.filter(n => n.isNewActivity).map(n => n.href),
        },
      })
    } else {
      // First time this course was scanned
      await browser.storage.local.set({
        [this.link]: {
          seenResources: this.resourceNodes.filter(n => !n.isNewResource).map(n => n.href),
          newResources: this.resourceNodes.filter(n => n.isNewResource).map(n => n.href),
          seenActivities: this.activityNodes.filter(n => !n.isNewActivity).map(n => n.href),
          newActivities: this.activityNodes.filter(n => n.isNewActivity).map(n => n.href),
        },
      })
    }
  }

  this.updateStoredResources = async function(downloadedResourceNodes) {
    const localStorage = await browser.storage.local.get()
    const storedCourseData = localStorage[this.link]
    const { seenResources, newResources } = storedCourseData

    // Default behavior: Merge all stored new resources
    let toBeMerged = newResources

    // If downloaded resources are provided then only merge those
    if (downloadedResourceNodes) {
      toBeMerged = downloadedResourceNodes.map(n => n.href)
    }

    // Merge already seen resources with new resources
    // Use set to remove duplicates
    const updatedSeenResources = Array.from(new Set(seenResources.concat(toBeMerged)))
    const updatedNewResources = newResources.filter(r => !updatedSeenResources.includes(r))

    const updatedCourseData = {
      ...storedCourseData,
      seenResources: updatedSeenResources,
      newResources: updatedNewResources,
    }

    await browser.storage.local.set({
      [this.link]: updatedCourseData,
    })

    return updatedCourseData
  }

  this.updateStoredActivities = async function() {
    const localStorage = await browser.storage.local.get()
    const storedCourseData = localStorage[this.link]

    const { seenActivities, newActivities } = storedCourseData
    const updatedSeenActivities = Array.from(new Set(seenActivities.concat(newActivities)))
    const updatedNewActivities = []

    const updatedCourseData = {
      ...storedCourseData,
      seenActivities: updatedSeenActivities,
      newActivities: updatedNewActivities,
    }

    await browser.storage.local.set({
      [this.link]: updatedCourseData,
    })

    return updatedCourseData
  }
}

export default Course
