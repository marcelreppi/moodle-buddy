import { ref } from "vue"
import { ExtensionOptions, Message, SelectionTab, StoredCourseData } from "@types"
import { COMMANDS } from "@shared/constants"

export const activeTab = ref<chrome.tabs.Tab>()
export const options = ref<ExtensionOptions>()
export const browserId = ref("")
export const overviewCourseLinks = ref<string[]>()
export const nUpdates = ref(0)
export const userHasRated = ref(false)
export const totalDownloadedFiles = ref(0)
export const rateHintLevel = ref(1)
export const courseData = ref<StoredCourseData>()
export const currentSelectionTab = ref<SelectionTab>()
export const onlyNewResources = ref(false)

export function updateState() {
  if (activeTab.value?.id) {
    chrome.tabs.sendMessage(activeTab.value.id, {
      command: COMMANDS.GET_STATE,
    } satisfies Message)
  }
}
