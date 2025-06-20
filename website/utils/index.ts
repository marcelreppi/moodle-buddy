import { browserName } from "detect-browser"
import { useRequestHeaders } from "nuxt/app"

const USER_AGENT_HEADER = "user-agent"

function isFirefoxAgent(userAgent: string) {
  return browserName(userAgent) === "firefox"
}

function isFirefoxBrowser() {
  const headers = useRequestHeaders([USER_AGENT_HEADER])
  const serverUserAgent = headers[USER_AGENT_HEADER] || ""
  const isFirefoxServer = isFirefoxAgent(serverUserAgent)
  const isFirefoxClient = isFirefoxAgent(navigator?.userAgent)
  return isFirefoxServer || isFirefoxClient
}

export { isFirefoxBrowser }
