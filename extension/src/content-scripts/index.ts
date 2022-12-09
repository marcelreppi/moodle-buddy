import { sendEvent, sendPageData } from "../shared/helpers"
import { ExtensionStorage, Message, StateMessage } from "../types"
import { detectPage } from "./detector"

const page = detectPage()

async function updateVueState() {
  const localStorage = (await chrome.storage.local.get()) as ExtensionStorage
  const { options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel } = localStorage
  console.log({ localStorage })
  chrome.runtime.sendMessage<StateMessage>({
    command: "state",
    state: { page, options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel },
  })
}

chrome.runtime.onMessage.addListener(async (message: object) => {
  const { command } = message as Message

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
    } as ExtensionStorage)
    updateVueState()
  }

  if (command === "avoid-rate-click") {
    const { rateHintLevel } = (await chrome.storage.local.get()) as ExtensionStorage
    await chrome.storage.local.set({
      rateHintLevel: rateHintLevel + 1,
    } as ExtensionStorage)
    updateVueState()
  }
})
