import { isDev, sendEvent, sendPageData } from "../shared/helpers"
import logger from "../shared/logger"
import { ExtensionStorage, Message, SetBadgeMessage, StateMessage } from "../types"
import "./backgroundScanner"
import { detectPage } from "./detector"

logger.debug({ env: process.env.NODE_ENV, isDev: isDev })

const page = detectPage()

chrome.runtime.sendMessage({
  command: "check-background-scan",
} as Message)

async function updateVueState() {
  const localStorage = (await chrome.storage.local.get()) as ExtensionStorage
  const { options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel } = localStorage
  logger.debug({ localStorage })
  chrome.runtime.sendMessage({
    command: "state",
    state: { page, options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel },
  } satisfies StateMessage)
}

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message
  logger.debug({ contentCommand: command })

  if (command === "get-state") {
    updateVueState()
  }

  if (command === "track-page-view") {
    if (page === undefined) return

    sendEvent(`view-${page}-page`, true)
    sendPageData(page)
  }

  if (command === "rate-click") {
    await chrome.storage.local.set({
      userHasRated: true,
    } satisfies Partial<ExtensionStorage>)
    updateVueState()
  }

  if (command === "avoid-rate-click") {
    const { rateHintLevel } = (await chrome.storage.local.get()) as ExtensionStorage
    await chrome.storage.local.set({
      rateHintLevel: rateHintLevel + 1,
    } satisfies Partial<ExtensionStorage>)
    updateVueState()
  }
})
