/* eslint-disable no-undef */

let activeTab = null
function getActiveTab() {
  return browser.tabs
    .query({ active: true, currentWindow: true })
    .then(tabs => {
      activeTab = tabs[0]
    })
    .catch(showErrorContent)
}

function checkURL() {
  return activeTab.url.match(/https:\/\/.*\/course\/view\.php\?id=/gi)
}

function scanForDocuments() {
  browser.tabs
    .sendMessage(activeTab.id, {
      command: "scan",
    })
    .catch(showErrorContent)
}

function listenForCrawl() {
  document.querySelector("#crawl-button").addEventListener("click", e => {
    if (document.querySelector("#crawl-button").disabled) return

    document.querySelector("#crawl-button").disabled = true

    sendEvent("download")
    browser.tabs
      .sendMessage(activeTab.id, {
        command: "crawl",
        useMoodleFilename: document.querySelector("#moodle-filename-check").checked,
        prependCourseToFilename: document.querySelector("#course-filename-check").checked,
        prependCourseShortcutToFilename: document.querySelector("#course-short-filename-check")
          .checked,
        skipDocuments: !document.querySelector("#documents-cb").checked,
        skipFolders: !document.querySelector("#folders-cb").checked,
      })
      .catch(showErrorContent)
  })
}

function showWrongPageContent() {
  document.querySelector("#popup-content").classList.add("hidden")
  document.querySelector("#wrong-page-content").classList.remove("hidden")
}

function showErrorContent(error) {
  document.querySelector("#popup-content").classList.add("hidden")
  document.querySelector("#wrong-page-content").classList.add("hidden")
  document.querySelector("#error-content").classList.remove("hidden")
  console.error(`Failed to execute crawling script: ${error.message}`)
}

function sendEvent(event) {
  const now = new Date()
  const isFirefox = typeof InstallTrigger !== "undefined"
  fetch(
    "https://e3hfofu2w1.execute-api.eu-central-1.amazonaws.com/default/tu-berlin-isis-course-crawler-event-tracker", // TODO: Make new lambda
    {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        event,
        date: now.toLocaleDateString("de-DE"),
        time: now.toLocaleTimeString("de-DE"),
        browser: isFirefox ? "firefox" : "chrome",
      }),
    }
  )
}

sendEvent("pageview")

browser.runtime.onMessage.addListener(message => {
  if (message.command === "scan-result") {
    document.querySelector("#resource-info-loading").classList.add("hidden")

    if (message.numberOfResources === 1) {
      document.querySelector("#resource-info-single").classList.remove("hidden")
    } else {
      document.querySelector("#resource-info-number").textContent = message.numberOfResources
      document.querySelector("#resource-info-multiple").classList.remove("hidden")

      if (message.numberOfResources === 0) {
        document.querySelector("#crawl-button").disabled = true
      }
    }

    document.querySelector("#n-documents").textContent = message.nDocuments
    document.querySelector("#n-folders").textContent = message.nFolders
    if (message.nDocuments === 0) {
      const el = document.querySelector("#documents-cb")
      el.disabled = true
      el.checked = false
    }

    if (message.nFolders === 0) {
      const el = document.querySelector("#folders-cb")
      el.disabled = true
      el.checked = false
    }
  }
})

document.querySelector(".info-icon").addEventListener("click", e => {
  browser.tabs.create({
    url: "../pages/information/information.html",
  })
  sendEvent("info-click")
})

document.querySelector("#documents-cb").addEventListener("input", e => {
  if (!e.target.checked && !document.querySelector("#folders-cb").checked) {
    document.querySelector("#crawl-button").disabled = true
  } else {
    document.querySelector("#crawl-button").disabled = false
  }
})

document.querySelector("#folders-cb").addEventListener("input", e => {
  if (!e.target.checked && !document.querySelector("#documents-cb").checked) {
    document.querySelector("#crawl-button").disabled = true
  } else {
    document.querySelector("#crawl-button").disabled = false
  }
})

getActiveTab().then(() => {
  const isMoodleCourseURL = checkURL()
  if (!isMoodleCourseURL) {
    showWrongPageContent()
    return
  }

  scanForDocuments()
  listenForCrawl()
})
