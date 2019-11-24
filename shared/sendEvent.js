import { apiUrl, apiKey } from "./env.js"

export function sendEvent(event) {
  console.log("sendEvent " + event)
  return
  const now = new Date()
  const isFirefox = typeof InstallTrigger !== "undefined"
  fetch(apiUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      event,
      browser: isFirefox ? "firefox" : "chrome",
    }),
  })
}
