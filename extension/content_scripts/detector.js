import { dashboardPageRegex, coursePageRegex, validURLRegex } from "../shared/helpers"
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
  const isDashboardPage = Boolean(location.href.match(dashboardPageRegex))
  const isCoursePage = Boolean(location.href.match(coursePageRegex))
  const urlIsSupported = isDashboardPage || isCoursePage
  const isMoodlePage = checkForMoodle()
  const isSupportedPage = urlIsSupported && isMoodlePage

  const {
    options,
    nUpdates,
    userHasRated,
    totalDownloadedFiles,
    rateHintLevel,
  } = await browser.storage.local.get()

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
        isDashboardPage,
        isCoursePage,
        options,
        nUpdates,
        userHasRated,
        totalDownloadedFiles,
        rateHintLevel,
      })
    }

    if (message.command === "rate-click") {
      await browser.storage.local.set({
        userHasRated: true,
      })
      runDetector()
    }

    if (message.command === "avoid-rate-click") {
      await browser.storage.local.set({
        rateHintLevel: rateHintLevel + 1,
      })
      runDetector()
    }
  })

  if (process.env.NODE_ENV === "debug") {
    const filename = location.href.split("/").pop()
    let page = ""

    if (filename.includes("course")) {
      page = "course"
    }

    if (filename.includes("dashboard")) {
      page = "dashboard"
    }

    if (page !== "") {
      browser.runtime.sendMessage({
        command: "debug",
        page,
      })
    }
  }
}

runDetector()
