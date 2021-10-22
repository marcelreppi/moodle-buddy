import { ref } from "vue"
import { ExtensionOptions, Message, StoredCourseData } from "../../types"

export const activeTab = ref<browser.tabs.Tab>()
export const options = ref<ExtensionOptions>()
export const browserId = ref<string>("")
export const overviewCourseLinks = ref<string[]>()
export const nUpdates = ref<number>(0)
export const userHasRated = ref<boolean>(false)
export const totalDownloadedFiles = ref<number>(0)
export const rateHintLevel = ref<number>(1)
export const courseData = ref<StoredCourseData>()

export function updateState() {
  if (activeTab.value?.id) {
    browser.tabs.sendMessage<Message>(activeTab.value.id, {
      command: "get-state",
    })
  }
}
