import { startingPageRegex, coursePageRegex, validURLRegex } from "../shared/helpers"

async function setDefaultMoodleURL() {
  const { options } = await browser.storage.local.get("options")

  if (!options.autoSetMoodleURL) return

  const baseURL = location.href.match(validURLRegex)[0]
  browser.storage.local.set({
    options: {
      ...options,
      defaultMoodleURL: `${baseURL}/my`,
    },
  })
}
const urlIsSupported =
  Boolean(location.href.match(startingPageRegex)) || Boolean(location.href.match(coursePageRegex))

if (urlIsSupported) {
  browser.runtime.sendMessage({
    command: "set-icon",
  })

  setDefaultMoodleURL()
}

if (process.env.NODE_ENV === "debug") {
  browser.runtime.sendMessage({
    command: "debug",
  })
}
