export function getActiveTab() {
  console.log("activeTab")
  return browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
}

export function sendEvent(event) {
  console.log("sendEvent " + event)
  return
  const now = new Date()
  const isFirefox = typeof InstallTrigger !== "undefined"
  fetch(
    "https://e3hfofu2w1.execute-api.eu-central-1.amazonaws.com/default/tu-berlin-isis-course-crawler-event-tracker", // TODO: Make new lambda
    {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        event,
        browser: isFirefox ? "firefox" : "chrome",
      }),
    }
  )
}
