import browser from "webextension-polyfill"
import { isFirefox, sendEvent } from "../../shared/helpers"
import { options } from "../state"

export default function useNavigation() {
  const openURL = (url: string) => {
    browser.tabs.create({ url })
    window.close()
  }
  const openContactPage = () => openURL("/pages/contact/contact.html")
  const openInfoPage = () => {
    openURL("/pages/information/information.html")
    sendEvent("info-click", false)
  }
  const openDonatePage = () => {
    openURL("https://paypal.me/marcelreppi")
    sendEvent("donate-click", false)
  }
  const openOptionsPage = () => {
    browser.runtime.openOptionsPage()
    sendEvent("options-click", false)
  }
  const openRatingPage = () => {
    const rateLink = isFirefox
      ? "https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/"
      : "https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo"
    openURL(rateLink)
    sendEvent("rate-click", false)
  }

  const openMoodlePage = () => {
    if (options.value === undefined) return

    openURL(options.value.defaultMoodleURL)
    sendEvent("go-to-moodle", false)
  }
  const openCoursePage = (url: string) => {
    openURL(url)
    sendEvent("go-to-course", true)
  }

  return {
    openURL,
    openContactPage,
    openInfoPage,
    openDonatePage,
    openOptionsPage,
    openRatingPage,
    openMoodlePage,
    openCoursePage,
  }
}
