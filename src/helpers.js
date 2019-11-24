export function getActiveTab() {
  console.log("activeTab")
  return browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
}
