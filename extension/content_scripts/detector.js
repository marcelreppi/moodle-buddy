import { startingPageRegex, coursePageRegex, validURLRegex } from "../shared/helpers"
import { checkForMoodle } from "../shared/parser"

async function setDefaultMoodleURL(options) {
  if (!options.autoSetMoodleURL) return

  const baseURL = location.href.match(validURLRegex)[0]
  browser.storage.local.set({
    options: {
      ...options,
      defaultMoodleURL: `${baseURL}/my`,
    },
  })
}

async function runDetector() {
  const isStartingPage = Boolean(location.href.match(startingPageRegex))
  const isCoursePage = Boolean(location.href.match(coursePageRegex))
  const urlIsSupported = isStartingPage || isCoursePage
  const isMoodlePage = checkForMoodle()
  const isSupportedPage = urlIsSupported && isMoodlePage

  const { options, nUpdates } = await browser.storage.local.get(["options", "nUpdates"])

  if (isSupportedPage) {
    browser.runtime.sendMessage({
      command: "set-icon",
    })

    setDefaultMoodleURL(options)
  }

  browser.runtime.onMessage.addListener(async message => {
    if (message.command === "get-state") {
      browser.runtime.sendMessage({
        command: "state",
        isSupportedPage,
        isStartingPage,
        isCoursePage,
        options,
        nUpdates,
      })
    }
  })

  if (process.env.NODE_ENV === "debug") {
    browser.runtime.sendMessage({
      command: "debug",
    })
  }
}

runDetector()
