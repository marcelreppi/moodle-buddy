import { sendEvent, sendPageData } from "../shared/helpers"
import logger from "../shared/logger"
import { ExtensionStorage, Message, SetBadgeMessage, StateMessage } from "../types"
import { detectPage } from "./detector"

const page = detectPage()

async function updateVueState() {
  const localStorage = (await chrome.storage.local.get()) as ExtensionStorage
  const { options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel } = localStorage
  logger.info({ localStorage })
  chrome.runtime.sendMessage({
    command: "state",
    state: { page, options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel },
  } satisfies StateMessage)
}

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message

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

  if (command === "update-non-moodle-page-badge") {
    if (page !== undefined) return
    const { nUpdates } = (await chrome.storage.local.get("nUpdates")) as ExtensionStorage
    const text = nUpdates === 0 ? "" : nUpdates.toString()
    chrome.runtime.sendMessage({
      command: "set-badge",
      text,
    } satisfies SetBadgeMessage)
  }
})
