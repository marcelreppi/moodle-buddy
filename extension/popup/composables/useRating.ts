import { getActiveTab, isFirefox, navigateTo, sendEvent } from "../../shared/helpers"
import { Message } from "../../types"

interface UseRatingComposable {
  rateHintLevels: Record<string, number>
  showRatingHint: (rateHintLevel: number, totalDownloadedFiles: number) => boolean
  onRateClick: () => void
  onAvoidRateClick: () => void
}

export default function useRating(): UseRatingComposable {
  const rateHintLevels = {
    1: 1,
    2: 2,
    3: 3,
    4: 500,
    5: 1000,
    6: 1500,
    7: 3000,
    8: 5000,
    9: 7500,
    10: 10000,
  } as Record<string, number>

  const rateLink = isFirefox()
    ? "https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/"
    : "https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo"

  const showRatingHint = (rateHintLevel: number, totalDownloadedFiles: number) => {
    const fileThreshold = rateHintLevels[rateHintLevel] || Infinity
    return totalDownloadedFiles > fileThreshold
  }

  const onRateClick = async () => {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) return

    browser.tabs.sendMessage<Message>(activeTab.id, {
      command: "rate-click",
    })
    navigateTo(rateLink)
    sendEvent("rate-click", false)
  }

  const onAvoidRateClick = async () => {
    const activeTab = await getActiveTab()
    if (!activeTab?.id) return

    browser.tabs.sendMessage<Message>(activeTab.id, {
      command: "avoid-rate-click",
    })
    sendEvent("avoid-rating-hint")
  }

  return {
    rateHintLevels,
    showRatingHint,
    onRateClick,
    onAvoidRateClick,
  }
}
