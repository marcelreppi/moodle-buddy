import browser from "webextension-polyfill"
import { ref } from "vue"
import { ExtensionOptions, Message, SelectionTab, StoredCourseData } from "../../types"

export const activeTab = ref<browser.Tabs.Tab>()
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
    browser.tabs.sendMessage(activeTab.value.id, {
      command: "get-state",
    } as Message)
  }
}
