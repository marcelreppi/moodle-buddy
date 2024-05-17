import sanitize from "sanitize-filename"
import logger from "../shared/logger"

export function uuidv4(): string {
  return [1e7, 1e3, 4e3, 8e3, 1e11].join("-").replace(/[018]/g, (c) => {
    const n = parseFloat(c)
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16)
  })
}

export async function setIcon(tabId?: number): Promise<void> {
  if (tabId) {
    await chrome.action.setIcon({
      path: {
        16: "/icons/16.png",
        32: "/icons/32.png",
        48: "/icons/48.png",
      },
      tabId,
    })
  }
}

// Set default badge
chrome.action.setBadgeBackgroundColor({ color: "#555555" })
chrome.action.setBadgeText({ text: "" })

export async function setBadgeText(text: string, tabId?: number): Promise<void> {
  if (tabId) {
    logger.debug(`Setting local badge to: ${text}`)
    // If tabId is given reset global and only set the local one
    await chrome.action.setBadgeText({ text: "" }) // Reset global badge text
    await chrome.action.setBadgeText({ text, tabId }) // Set local badge text
  } else {
    logger.debug(`Setting global badge to: ${text}`)
    await chrome.action.setBadgeText({ text })
  }
}

export function sanitizeFileName(fileName: string, connectingString = ""): string {
  return sanitize(
    fileName.replace(/( )\1+/gi, " "), // Remove > 1 white spaces
    { replacement: connectingString }
  )
}

export function getFileTypeFromURL(url: string): string {
  const urlParts = url.split(/[#?]/)
  const urlPath = urlParts.shift()
  if (urlPath !== undefined) {
    const partParts = urlPath.split(".")
    const fileType = partParts.pop()
    if (fileType !== undefined) {
      return fileType.trim()
    }
  }

  return ""
}

export function padNumber(n: number, padding = 0): string {
  const nString = String(n)

  if (nString.length < padding) {
    return "0".repeat(padding - nString.length) + nString
  }

  return nString
}
