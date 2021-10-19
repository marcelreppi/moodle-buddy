import { isFirefox, navigateTo, sendEvent } from "../../shared/helpers"
import { Message } from "../../types"
import { activeTab, userHasRated, rateHintLevel, totalDownloadedFiles } from "../state"

interface UseRatingComposable {
  rateHintLevels: Record<string, number>
  showRatingHint: () => boolean
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

  const rateLink = isFirefox
    ? "https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/"
    : "https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo"

  const showRatingHint = () => {
    const fileThreshold = rateHintLevels[rateHintLevel.value] || Infinity
    return !userHasRated.value && totalDownloadedFiles.value > fileThreshold
  }

  const onRateClick = async () => {
    if (!activeTab.value?.id) return

    browser.tabs.sendMessage<Message>(activeTab.value.id, {
      command: "rate-click",
    })
    navigateTo(rateLink)
    sendEvent("rate-click", false)
  }

  const onAvoidRateClick = async () => {
    if (!activeTab.value?.id) return

    browser.tabs.sendMessage<Message>(activeTab.value.id, {
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
