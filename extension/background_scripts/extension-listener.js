import { sendEvent, uuidv4, setIcon, setBadgeText } from "./helpers"

const defaultOptions = {
  onlyNewResources: false,
  saveToFolder: true,
  useMoodleFileName: true,
  showDownloadOptions: true,
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
  sendEvent("install")
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

  sendEvent("update")
}

browser.runtime.onInstalled.addListener(async details => {
  switch (details.reason) {
    case "install":
      onInstall()
      break
    case "update":
      onUpdate()
      break
    default:
      break
  }
})

browser.runtime.onMessage.addListener(async (message, sender) => {
  switch (message.command) {
    case "event":
      sendEvent(message.event)
      break
    case "set-icon":
      setIcon(message.type, sender.tab.id)
      break
    case "set-badge":
      setBadgeText(message.text, sender.tab.id)
      break
    default:
      break
  }
})
