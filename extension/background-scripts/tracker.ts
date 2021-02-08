import { ExtensionStorage } from "extension/types/global.types"
import {
  AdditionalPayload,
  DownloadData,
  EventData,
  FeedbackData,
  LogData,
  PageData,
  Payload,
} from "extension/types/tracker.types"
import { isFirefox, getActiveTab } from "../shared/helpers"

const isDev = process.env.NODE_ENV !== "production"

async function sendToLambda(path: string, payload: AdditionalPayload) {
  const { options, browserId }: ExtensionStorage = await browser.storage.local.get([
    "options",
    "browserId",
  ])

  if (options.disableInteractionTracking) {
    // console.log("Moodle Buddy Tracking disabled!")
    if (path === "/event") {
      const eventExceptions = ["install", "update"]
      if (!eventExceptions.includes((payload as EventData).event)) {
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
    browser: isFirefox() ? "firefox" : "chrome",
    browserId,
    dev: isDev,
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
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
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

  const payload: EventData = { event, url, eventData }
  sendToLambda("/event", payload)
}

export async function sendDownloadData(data: DownloadData): Promise<void> {
  sendToLambda("/download", data)
}

export async function sendPageData(payload: PageData): Promise<void> {
  if (!isDev) {
    sendToLambda("/page", payload)
  }
}

export async function sendFeedback(payload: FeedbackData): Promise<void> {
  sendEvent("feedback", false)
  sendToLambda("/feedback", payload)
}

export async function sendLog(payload: LogData): Promise<void> {
  const { errorMessage } = payload

  const skipMessages = ["Failed to fetch", "Download canceled by the user"]
  if (errorMessage && skipMessages.includes(errorMessage)) {
    return
  }

  sendToLambda("/log", payload)
}
