import * as parser from "../shared/parser"
import { sendLog, validURLRegex } from "../shared/helpers"

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
    try {
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

      const localStorage = await browser.storage.local.get()
      const { options } = localStorage

      if (localStorage[this.link]) {
        this.isFirstScan = false
        storedCourseData = localStorage[this.link]
      }

      const {
        seenResources: previousSeenResources = null,
        seenActivities: previousSeenActivities = null,
      } = storedCourseData

      const addFileNode = node => {
        const href = parser.parseURLFromNode(node, "file", options)
        if (href === "") return

        this.resourceCounts.nFiles++
        const resourceNode = {
          href,
          fileName: parser.parseFileNameFromNode(node),
          section: parser.parseSectionName(node),
          isFile: true,
          isPluginFile: false,
          isNewResource: null,
        }

        if (previousSeenResources === null || previousSeenResources.includes(href)) {
          // If course has never been scanned previousSeenResources don't exist
          // Never treat a resource as new when the course is scanned for the first time
          // because we're capturing the initial state of the course
          resourceNode.isNewResource = false
        } else {
          this.resourceCounts.nNewFiles++
          resourceNode.isNewResource = true
        }

        this.resourceNodes.push(resourceNode)
      }

      const addPluginFileNode = (node, partOfFolder = "") => {
        const href = parser.parseURLFromNode(node, "pluginfile", options)
        if (href === "") return

        // Avoid duplicates
        const detectedURLs = this.resourceNodes.map(n => n.href)
        if (detectedURLs.includes(href)) return

        this.resourceCounts.nFiles++
        const resourceNode = {
          href,
          fileName: parser.parseFileNameFromPluginFileURL(href),
          section: parser.parseSectionName(node),
          partOfFolder,
          isFile: true,
          isPluginFile: true,
          isNewResource: null,
        }

        if (previousSeenResources === null || previousSeenResources.includes(href)) {
          resourceNode.isNewResource = false
        } else {
          this.resourceCounts.nNewFiles++
          resourceNode.isNewResource = true
        }

        this.resourceNodes.push(resourceNode)
      }

      const addFolderNode = node => {
        const href = parser.parseURLFromNode(node, "folder", options)
        const resourceNode = {
          href,
          folderName: parser.parseFileNameFromNode(node),
          section: parser.parseSectionName(node),
          isFolder: true,
          isInline: false,
          isNewResource: null,
        }

        if (href === "") {
          // Folder could be displayed inline
          const downloadButtonVisible = parser.getDownloadButton(node) !== null
          const { downloadFolderAsZip } = options

          if (downloadFolderAsZip && downloadButtonVisible) {
            const downloadIdTag = parser.getDownloadIdTag(node)
            if (downloadIdTag === null) return

            const baseURL = this.link.match(validURLRegex)
            const downloadId = downloadIdTag.getAttribute("value")
            const downloadURL = `${baseURL}/mod/folder/download_folder.php?id=${downloadId}`

            resourceNode.href = downloadURL
            resourceNode.isInline = true
          } else {
            // Not downloading via button as ZIP
            // Download folder as individual pluginfiles
            // Look for any pluginfiles
            const folderFiles = node.querySelectorAll(
              parser.getQuerySelector("pluginfile", options)
            )
            for (const pluginFile of folderFiles) {
              addPluginFileNode(pluginFile, resourceNode.folderName)
            }
            return
          }
        }

        this.resourceCounts.nFolders++

        if (previousSeenResources === null || previousSeenResources.includes(href)) {
          resourceNode.isNewResource = false
        } else {
          this.resourceCounts.nNewFolders++
          resourceNode.isNewResource = true
        }

        this.resourceNodes.push(resourceNode)
      }

      const addActivityNode = node => {
        const href = parser.parseURLFromNode(node, "activity", options)
        if (href === "") return

        this.activityCounts.nActivities++
        const activityNode = {
          href,
          activityName: parser.parseActivityNameFromNode(node),
          activityType: parser.parseActivityTypeFromNode(node),
          section: parser.parseSectionName(node),
          isActivity: true,
          isNewActivity: null,
        }

        if (previousSeenActivities === null || previousSeenActivities.includes(href)) {
          activityNode.isNewActivity = false
        } else {
          this.activityCounts.nNewActivities++
          activityNode.isNewActivity = true
        }

        this.activityNodes.push(activityNode)
      }

      const mainHTML = this.HTMLDocument.querySelector("#region-main")

      const modules = mainHTML.querySelectorAll("li[id^='module-']")
      if (modules && modules.length !== 0) {
        for (const node of modules) {
          const isFile = node.classList.contains("resource")
          const isFolder = node.classList.contains("folder")

          if (isFile) {
            addFileNode(node)
          } else if (isFolder) {
            addFolderNode(node)
          } else {
            addActivityNode(node)
          }
        }

        // Check for pluginfiles that could be anywhere on the page
        const pluginFileNodes = mainHTML.querySelectorAll(
          parser.getQuerySelector("pluginfile", options)
        )
        const mediaFileNodes = mainHTML.querySelectorAll(parser.getQuerySelector("media", options))
        pluginFileNodes.forEach(n => addPluginFileNode(n))
        mediaFileNodes.forEach(n => addPluginFileNode(n))
      } else {
        // Backup solution that is a little more brute force
        const fileNodes = mainHTML.querySelectorAll(parser.getQuerySelector("file", options))
        const pluginFileNodes = mainHTML.querySelectorAll(
          parser.getQuerySelector("pluginfile", options)
        )
        const mediaFileNodes = mainHTML.querySelectorAll(parser.getQuerySelector("media", options))
        const folderNodes = mainHTML.querySelectorAll(parser.getQuerySelector("folder", options))
        const activityNodes = mainHTML.querySelectorAll(
          parser.getQuerySelector("activity", options)
        )

        fileNodes.forEach(n => addFileNode(n))
        pluginFileNodes.forEach(n => addPluginFileNode(n))
        mediaFileNodes.forEach(n => addPluginFileNode(n))
        folderNodes.forEach(n => addFolderNode(n))
        activityNodes.forEach(n => addActivityNode(n))
      }

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
    } catch (error) {
      console.error(error)
      sendLog({ errorMessage: error.message, url: this.link })
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
