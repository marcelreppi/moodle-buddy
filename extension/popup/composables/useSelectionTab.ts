import { Ref, ref } from "vue"
import { SelectionTab } from "../types"

interface UseSelectionTabReturn {
  selectionTab: Ref<SelectionTab>
  selectionTabs: SelectionTab[]
  setSelectionTab: (tab: SelectionTab) => void
}

export default function useSelectionTab(selectionTabs: SelectionTab[]): UseSelectionTabReturn {
  const selectionTab = ref<SelectionTab>(selectionTabs[0])
  const setSelectionTab = (tab: SelectionTab) => {
    selectionTab.value = tab
  }

  return {
    selectionTab,
    selectionTabs,
    setSelectionTab,
  }
}
