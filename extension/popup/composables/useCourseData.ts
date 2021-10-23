import { Activity, CourseScanResultMessage, Message, Resource, SelectionTab } from "types"
import { computed, ComputedRef, Ref, ref, watch } from "vue"
import { isFile, isFolder, sendEvent } from "../../shared/helpers"
import { activeTab, options } from "../state"

interface CourseData {
  nFiles: Ref<number>
  nNewFiles: Ref<number>
  nFolders: Ref<number>
  nNewFolders: Ref<number>
  nActivities: Ref<number>
  nNewActivities: Ref<number>
  resources: Ref<Resource[]>
  activities: Ref<Activity[]>
  downloadFiles: Ref<boolean>
  downloadFolders: Ref<boolean>
  onlyNewResources: Ref<boolean>
  nNewResources: ComputedRef<number>
  newResources: ComputedRef<Resource[]>
  newActivities: ComputedRef<Activity[]>
  selectedResources: ComputedRef<Resource[]>
  showNewResourceInfo: ComputedRef<boolean>
  showNewActivityInfo: ComputedRef<boolean>
  disableFilesCb: ComputedRef<boolean>
  disableFoldersCb: ComputedRef<boolean>
  scanResultHandler: (message: Message) => void
  onDownload: () => void
  onMarkAsSeenClick: () => void
}

export default function useCourseData(selectionTab: Ref<SelectionTab>): CourseData {
  const nFiles = ref(-1)
  const nNewFiles = ref(-1)
  const nFolders = ref(-1)
  const nNewFolders = ref(-1)
  const nActivities = ref(-1)
  const nNewActivities = ref(-1)
  const resources = ref<Resource[]>([])
  const activities = ref<Activity[]>([])
  const downloadFiles = ref(true)
  const downloadFolders = ref(true)
  const onlyNewResources = ref(false)

  const nNewResources = computed(() => nNewFiles.value + nNewFolders.value)
  const newResources = computed(() => resources.value.filter((n) => n.isNew))
  const newActivities = computed(() => activities.value.filter((n) => n.isNew))
  const selectedResources = computed(() => {
    return resources.value.filter((n) => {
      if (selectionTab.value.id === "simple") {
        if (!downloadFiles.value && isFile(n)) return false
        if (!downloadFolders.value && isFolder(n)) return false
        if (onlyNewResources.value && !n.isNew) return false

        return true
      }

      if (selectionTab.value.id === "detailed") {
        return n.selected
      }

      return false
    })
  })

  const showNewResourceInfo = computed(() => nNewFiles.value > 0 || nNewFolders.value > 0)
  const showNewActivityInfo = computed(() => nNewActivities.value > 0)
  const disableFilesCb = computed(() => {
    if (onlyNewResources.value) {
      return nNewFiles.value === 0
    }
    return nFiles.value === 0
  })
  const disableFoldersCb = computed(() => {
    if (onlyNewResources.value) {
      return nNewFolders.value === 0
    }
    return nFolders.value === 0
  })

  const handleCheckboxes = () => {
    if (onlyNewResources.value) {
      downloadFiles.value = nNewFiles.value !== 0
      downloadFolders.value = nNewFolders.value !== 0
    } else {
      downloadFiles.value = nFiles.value !== 0
      downloadFolders.value = nFolders.value !== 0
    }
  }
  watch(nFiles, handleCheckboxes)
  watch(nFolders, handleCheckboxes)
  watch(onlyNewResources, handleCheckboxes)

  const scanResultHandler = (message: Message) => {
    const { course } = message as CourseScanResultMessage
    const { resources: detectedResources, activities: detectedActivities, counts } = course
    nFiles.value = counts.nFiles
    nNewFiles.value = counts.nNewFiles
    nFolders.value = counts.nFolders
    nNewFolders.value = counts.nNewFolders
    resources.value = detectedResources.map((r) => ({ ...r, selected: false }))

    nActivities.value = counts.nActivities
    nNewActivities.value = counts.nNewActivities
    activities.value = detectedActivities

    if (nNewResources.value > 0) {
      onlyNewResources.value = options.value?.onlyNewResources ?? false
    }

    if (nNewActivities.value > 0) {
      if (activeTab.value?.id) {
        browser.tabs.sendMessage<Message>(activeTab.value.id, {
          command: "update-activities",
        })
      }
    }
  }

  const onDownload = () => {
    const eventParts = ["download-course-page", selectionTab.value.id]
    if (onlyNewResources.value) {
      eventParts.push("only-new")
    }
    sendEvent(eventParts.join("-"), true, { numberOfFiles: selectedResources.value.length })
  }

  const onMarkAsSeenClick = () => {
    sendEvent("mark-as-seen-course-page", true)
    onlyNewResources.value = false
    nNewFiles.value = 0
    nNewFolders.value = 0
    nNewActivities.value = 0
    if (activeTab.value?.id) {
      browser.tabs.sendMessage<Message>(activeTab.value.id, {
        command: "mark-as-seen",
      })
    }
  }

  return {
    nFiles,
    nNewFiles,
    nFolders,
    nNewFolders,
    nActivities,
    nNewActivities,
    resources,
    activities,
    downloadFiles,
    downloadFolders,
    onlyNewResources,
    nNewResources,
    newResources,
    newActivities,
    selectedResources,
    showNewResourceInfo,
    showNewActivityInfo,
    disableFilesCb,
    disableFoldersCb,
    scanResultHandler,
    onDownload,
    onMarkAsSeenClick,
  }
}
