import browser from "webextension-polyfill"
import { sendEvent, sendPageData } from "../shared/helpers"
import { ExtensionStorage, Message, StateMessage } from "../types"
import { detectPage } from "./detector"

const page = detectPage()

async function updateVueState() {
  const localStorage = (await browser.storage.local.get()) as ExtensionStorage
  const { options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel } = localStorage
  console.log({ localStorage })
  browser.runtime.sendMessage({
    command: "state",
    state: { page, options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel },
  } as StateMessage)
}

browser.runtime.onMessage.addListener(async (message: Message) => {
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
    await browser.storage.local.set({
      userHasRated: true,
    } as ExtensionStorage)
    updateVueState()
  }

  if (command === "avoid-rate-click") {
    const { rateHintLevel } = (await browser.storage.local.get()) as ExtensionStorage
    await browser.storage.local.set({
      rateHintLevel: rateHintLevel + 1,
    } as ExtensionStorage)
    updateVueState()
  }
})
