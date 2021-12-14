import { sendEvent, sendPageData } from "../shared/helpers"
import { ExtensionStorage, Message, StateMessage } from "../types"
import { detectPage } from "./detector"

const page = detectPage()

async function updateVueState() {
  const localStorage: ExtensionStorage = await browser.storage.local.get()
  const { options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel } = localStorage
  browser.runtime.sendMessage<StateMessage>({
    command: "state",
    state: { page, options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel },
  })
}

const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
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
    await browser.storage.local.set({
      userHasRated: true,
    })
    updateVueState()
  }

  if (command === "avoid-rate-click") {
    const { rateHintLevel }: ExtensionStorage = await browser.storage.local.get()
    await browser.storage.local.set({
      rateHintLevel: rateHintLevel + 1,
    })
    updateVueState()
  }
}
browser.runtime.onMessage.addListener(messageListener)
