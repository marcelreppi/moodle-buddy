import { isFirefox, navigateTo, sendEvent } from "../../shared/helpers"
import { options } from "../state"

export default function useNavigation() {
  const openContactPage = () => navigateTo("/pages/contact/contact.html")
  const openInfoPage = () => {
    navigateTo("/pages/information/information.html")
    sendEvent("info-click", false)
  }
  const openDonatePage = () => {
    navigateTo("https://paypal.me/marcelreppi")
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
    navigateTo(rateLink)
    sendEvent("rate-click", false)
  }
  const openMoodlePage = async () => {
    await browser.tabs.create({ url: options.value?.defaultMoodleURL })
    sendEvent("go-to-moodle", false)
    window.close()
  }

  return {
    openContactPage,
    openInfoPage,
    openDonatePage,
    openOptionsPage,
    openRatingPage,
    openMoodlePage,
  }
}
