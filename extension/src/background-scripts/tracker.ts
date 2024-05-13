import {
  ExtensionStorage,
  AdditionalPayloadData,
  DownloadPayloadData,
  EventPayloadData,
  FeedbackPayloadData,
  LogPayloadData,
  PagePayloadData,
  Payload,
} from "types"

import { isFirefox, getActiveTab, isDev } from "../shared/helpers"

async function sendToLambda(path: string, payload: AdditionalPayloadData) {
  const { options, browserId } = (await chrome.storage.local.get([
    "options",
    "browserId",
  ])) as ExtensionStorage

  if (options.disableInteractionTracking) {
    // console.log("Moodle Buddy Tracking disabled!")
    if (path === "/event") {
      const eventExceptions = ["install", "update"]
      if (!eventExceptions.includes((payload as EventPayloadData).event)) {
        return
      }
    }

    // Feeback and logs are always sent
    const pathExceptions = ["/feedback", "/log"]
    if (!pathExceptions.includes(path)) {
      return
    }
  }

  const requestBody: Payload = {
    ...payload,
    browser: isFirefox ? "firefox" : "chrome",
    browserId,
    dev: isDev,
    version: chrome.runtime.getManifest().version,
  }

  if (isDev) {
    console.log(requestBody)
  }

  if (process.env.API_URL) {
    try {
      fetch(`${process.env.API_URL}${path}`, {
        method: "POST",
        headers: {
          "User-Agent": navigator.userAgent,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
    } catch (error) {
      console.error(error)
      setTimeout(() => {
        sendLog({ errorMessage: error.message })
      }, 5000)
    }
  }
}

export async function sendEvent(
  event: string,
  saveURL: boolean,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  let url = ""
  if (saveURL) {
    const activeTab = await getActiveTab()
    url = activeTab?.url || ""
  }

  const payload: EventPayloadData = { event, url, eventData }
  sendToLambda("/event", payload)
}

export async function sendDownloadData(data: DownloadPayloadData): Promise<void> {
  sendToLambda("/download", data)
}

export async function sendPageData(payload: PagePayloadData): Promise<void> {
  if (!isDev) {
    sendToLambda("/page", payload)
  }
}

export async function sendFeedback(payload: FeedbackPayloadData): Promise<void> {
  sendEvent("feedback", false)
  sendToLambda("/feedback", payload)
}

export async function sendLog(payload: LogPayloadData): Promise<void> {
  const { errorMessage } = payload

  const skipMessages = [
    "Failed to fetch",
    "Download canceled by the user",
    "QUOTA_BYTES quota exceeded",
  ]
  if (errorMessage && skipMessages.includes(errorMessage)) {
    return
  }

  sendToLambda("/log", payload)
}
