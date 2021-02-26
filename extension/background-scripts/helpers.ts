export function uuidv4(): string {
  return [1e7, 1e3, 4e3, 8e3, 1e11].join("-").replace(/[018]/g, c => {
    const n = parseFloat(c)
    // eslint-disable-next-line no-bitwise
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16)
  })
}

export async function setIcon(tabId?: number): Promise<void> {
  if (tabId) {
    await browser.browserAction.setIcon({
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
browser.browserAction.setBadgeBackgroundColor({ color: "#555555" })
browser.browserAction.setBadgeText({ text: "" })

export async function setBadgeText(text: string, tabId?: number): Promise<void> {
  if (tabId) {
    // If tabId is given reset global and only set the local one
    await browser.browserAction.setBadgeText({ text: "" }) // Reset global badge text
    await browser.browserAction.setBadgeText({ text, tabId }) // Set local badge text
    await browser.storage.local.set({ nUpdates: 0 }) // Reset background update counter
  } else {
    await browser.browserAction.setBadgeText({ text })
  }
}

export function sanitizeFileName(fileName: string, connectingString = ""): string {
  return fileName
    .trim()
    .replace(/\\|\/|:|\*|\?|"|<|>|\|/gi, connectingString) // Remove illegal chars
    .replace(/( )\1+/gi, " ") // Remove > 1 white spaces
    .replace(/^\.*/gi, "") // Remove dots at the start
    .replace(/\.*$/gi, "") // Remove dots at the end
    .trim()
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
