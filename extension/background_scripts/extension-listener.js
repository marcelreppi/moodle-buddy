import { sendEvent, sendPageData, sendFeedback, uuidv4, setIcon, setBadgeText } from "./helpers"

const defaultOptions = {
  onlyNewResources: false,
  saveToFolder: true,
  useMoodleFileName: true,
  showDownloadOptions: false,
  prependCourseShortcutToFileName: false,
  prependCourseToFileName: false,
  alwaysShowDetails: false,
  disableInteractionTracking: false,
  defaultMoodleURL: "",
  autoSetMoodleURL: true,
  backgroundScanInterval: 30,
  enableBackgroundScanning: true,
}

const initialStorage = {
  options: defaultOptions,
  browserId: uuidv4(),
  overviewCourseLinks: [], // Used for background scanning
  nUpdates: 0, // Used for storing updates from background scan
}

async function onInstall() {
  await browser.storage.local.set({
    ...initialStorage,
  })

  browser.tabs.create({
    url: "/pages/install/install.html",
  })

  sendEvent("install", false)
}

async function onUpdate() {
  const { options, browserId, overviewCourseLinks, nUpdates } = await browser.storage.local.get()

  if (process.env.NODE_ENV === "development") {
    await browser.storage.local.set({
      options: defaultOptions,
    })
  }

  // Merge existing options
  let updatedOptions = { ...defaultOptions }
  if (options) {
    updatedOptions = { ...updatedOptions, ...options }
  }

  // Merge existing storage data
  await browser.storage.local.set({
    options: updatedOptions,
    browserId: browserId || initialStorage.browserId,
    overviewCourseLinks: overviewCourseLinks || initialStorage.overviewCourseLinks,
    nUpdates: nUpdates || initialStorage.nUpdates,
  })

  sendEvent("update", false)
}

browser.runtime.onInstalled.addListener(async details => {
  switch (details.reason) {
    case "install":
      await onInstall()
      break
    case "update":
      await onUpdate()
      break
    default:
      break
  }

  const { browserId } = await browser.storage.local.get("browserId")
  browser.runtime.setUninstallURL(
    `http://moodle-buddy-uninstall-page.s3-website.eu-central-1.amazonaws.com?browserId=${browserId}`
  )
})

browser.runtime.onMessage.addListener(async (message, sender) => {
  switch (message.command) {
    case "event":
      sendEvent(message.event, message.saveURL, message.eventData)
      break
    case "page-data":
      sendPageData(message.HTMLString, message.page)
      break
    case "feedback":
      sendFeedback(message.subject, message.content)
      break
    case "set-icon":
      setIcon(sender.tab.id)
      break
    case "set-badge":
      setBadgeText(message.text, sender.tab.id)
      break
    case "debug":
      browser.tabs.executeScript({
        file: `../content_scripts/${message.page}-page.js`,
      })
      break
    default:
      break
  }
})
