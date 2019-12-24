import { sendEvent } from "../shared/helpers.js"

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  )
}

browser.runtime.onInstalled.addListener(details => {
  switch (details.reason) {
    case "install":
      const randomId = uuidv4()
      browser.storage.local
        .set({
          browserId: randomId,
        })
        .then(() => {
          sendEvent("install")
        })

      break
    case "update":
      sendEvent("update")
      break
    default:
      break
  }
})
