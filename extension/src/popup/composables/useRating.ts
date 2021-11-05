import { computed, ComputedRef } from "vue"
import { sendEvent } from "../../shared/helpers"
import { Message } from "../../types"
import { activeTab, userHasRated, rateHintLevel, totalDownloadedFiles } from "../state"
import useNavigation from "./useNavigation"

interface UseRatingComposable {
  rateHintLevels: Record<string, number>
  showRatingHint: ComputedRef<boolean>
  onRateClick: () => void
  onAvoidRateClick: () => void
}

export default function useRating(): UseRatingComposable {
  const rateHintLevels = {
    1: 50,
    2: 100,
    3: 250,
    4: 500,
    5: 1000,
    6: 1500,
    7: 3000,
    8: 5000,
    9: 7500,
    10: 10000,
    11: 15000,
    12: 25000,
    13: 50000,
  } as Record<string, number>

  const showRatingHint = computed(() => {
    const fileThreshold = rateHintLevels[rateHintLevel.value] || Infinity
    return !userHasRated.value && totalDownloadedFiles.value > fileThreshold
  })

  const { openRatingPage } = useNavigation()
  const onRateClick = async () => {
    if (!activeTab.value?.id) return

    browser.tabs.sendMessage<Message>(activeTab.value.id, {
      command: "rate-click",
    })
    openRatingPage()
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
