import { isFirefox, sendEvent } from "../../shared/helpers"
import { options } from "../state"

function navigateTo(url: string) {
  browser.tabs.create({ url })
  window.close()
}

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

  const openMoodlePage = () => {
    if (options.value === undefined) return

    navigateTo(options.value.defaultMoodleURL)
    sendEvent("go-to-moodle", false)
  }
  const openCoursePage = (url: string) => {
    navigateTo(url)
    sendEvent("go-to-course", true)
  }

  return {
    openContactPage,
    openInfoPage,
    openDonatePage,
    openOptionsPage,
    openRatingPage,
    openMoodlePage,
    openCoursePage,
  }
}
