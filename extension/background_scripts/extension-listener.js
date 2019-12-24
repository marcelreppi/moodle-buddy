import { sendEvent } from "../shared/helpers.js"

browser.runtime.onInstalled.addListener(details => {
  switch (details.reason) {
    case "install":
      sendEvent("install")
      break
    case "update":
      sendEvent("update")
      break
    default:
      break
  }
})
