import { sendEvent, uuidv4, setIcon } from "./helpers"

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
  backgroundScanInterval: 30,
  enableBackgroundScanning: true,
}

const initialStorage = {
  options: defaultOptions,
  overviewCourseLinks: [],
}

browser.runtime.onInstalled.addListener(async details => {
  const { browserId } = await browser.storage.local.get("browserId")
  switch (details.reason) {
    case "install":
      await browser.storage.local.set({
        browserId: uuidv4(),
        ...initialStorage,
      })
      sendEvent("install")
      break
    case "update":
      // if (process.env.NODE_ENV === "development") {
      // }
      if (browserId === undefined) {
        await browser.storage.local.set({
          browserId: uuidv4(),
        })
      }
      sendEvent("update")
      break
    default:
      break
  }
})

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.command === "event") {
    sendEvent(message.event)
    return
  }

  if (message.command === "set-icon") {
    setIcon(message.type, message.text, sender.tab.id)
    return
  }
})
