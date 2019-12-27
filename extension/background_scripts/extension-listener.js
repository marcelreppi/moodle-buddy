import { isFirefox } from "../shared/helpers"

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

browser.runtime.onMessage.addListener(async message => {
  if (message.command === "event") {
    sendEvent(message.event)
  }
})

async function sendEvent(event) {
  const { options, browserId } = await browser.storage.local.get(["options", "browserId"])

  if (options && options.disableInteractionTracking) {
    if (!(event === "install" || event === "update")) {
      // Excluding install and update events
      console.log("Tracking disabled!")
      return
    }
  }

  if (!process.env.API_URL || !process.env.API_KEY) {
    return
  }

  if (process.env.NODE_ENV === "development") {
    console.log({
      event,
      browser: isFirefox() ? "firefox" : "chrome",
      browserId,
    })
  }

  fetch(process.env.API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": process.env.API_KEY,
    },
    body: JSON.stringify({
      event,
      browser: isFirefox() ? "firefox" : "chrome",
      browserId,
      dev: process.env.NODE_ENV === "development",
    }),
  })
    .then(res => console.info(res))
    .catch(error => console.log(error))
}
