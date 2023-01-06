<template>
  <files-view-layout
    view="course"
    :resources="resources"
    :activities="activities"
    @download="onDownload"
    @mark-as-seen="onMarkAsSeen"
  >
    <template #simple-selection>
      <label>
        <input v-model="downloadFiles" type="checkbox" :disabled="disableFilesCb" />
        <span class="ml-1">
          {{ onlyNewResources ? nNewFiles + nUpdatedFiles : nFiles }} file(s) (PDF, etc.)
        </span>
      </label>
      <label>
        <input v-model="downloadFolders" type="checkbox" :disabled="disableFoldersCb" />
        <span class="ml-1">
          {{ onlyNewResources ? nNewFolders + nUpdatedFolders : nFolders }} folder(s)
        </span>
      </label>
    </template>

    <template #detailed-selection>
      <detailed-resource-selection :resources="resources" />
    </template>
  </files-view-layout>
</template>

<script setup lang="ts">
import browser from "webextension-polyfill"
import { ref, computed, watch } from "vue"
import { sendEvent } from "../../shared/helpers"
import { isFile, isFolder } from "../../shared/resourceHelpers"
import { Resource, Activity, Message, CourseScanResultMessage } from "../../types"
import FilesViewLayout from "../components/FilesViewLayout.vue"
import DetailedResourceSelection from "../components/DetailedResourceSelection.vue"
import { options, activeTab, currentSelectionTab, onlyNewResources } from "../state"

// Resources
const resources = ref<Resource[]>([])
const activities = ref<Activity[]>([])
const nFiles = computed(() => resources.value.filter(isFile).length)
const nNewFiles = computed(() => resources.value.filter((r) => isFile(r) && r.isNew).length)
const nUpdatedFiles = computed(() => resources.value.filter((r) => isFile(r) && r.isUpdated).length)
const nFolders = computed(() => resources.value.filter(isFolder).length)
const nNewFolders = computed(() => resources.value.filter((r) => isFolder(r) && r.isNew).length)
const nUpdatedFolders = computed(
  () => resources.value.filter((r) => isFolder(r) && r.isUpdated).length
)
const nNewAndUpdatedResources = computed(
  () => nNewFiles.value + nUpdatedFiles.value + nNewFolders.value + nUpdatedFolders.value
)
const nNewActivities = computed(() => activities.value.filter((a) => a.isNew).length)

// Checkboxes
const downloadFiles = ref(false)
const downloadFolders = ref(false)
const disableFilesCb = computed(() => {
  if (onlyNewResources.value) {
    return nNewFiles.value + nUpdatedFiles.value === 0
  }
  return nFiles.value === 0
})
const disableFoldersCb = computed(() => {
  if (onlyNewResources.value) {
    return nNewFolders.value + nUpdatedFolders.value === 0
  }
  return nFolders.value === 0
})
const setCheckboxState = () => {
  if (onlyNewResources.value) {
    downloadFiles.value = nNewFiles.value + nUpdatedFiles.value !== 0
    downloadFolders.value = nNewFolders.value + nUpdatedFolders.value !== 0
  } else {
    downloadFiles.value = nFiles.value !== 0
    downloadFolders.value = nFolders.value !== 0
  }
}
const setFilesSelected = () =>
  resources.value.filter(isFile).forEach((r) => {
    if (onlyNewResources.value) {
      r.selected = downloadFiles.value && (r.isNew || r.isUpdated)
    } else {
      r.selected = downloadFiles.value
    }
  })

const setFoldersSelected = () =>
  resources.value.filter(isFolder).forEach((r) => {
    if (onlyNewResources.value) {
      r.selected = downloadFolders.value && (r.isNew || r.isUpdated)
    } else {
      r.selected = downloadFolders.value
    }
  })
watch(onlyNewResources, () => {
  if (currentSelectionTab.value?.id === "simple") {
    setCheckboxState()
  }

  setFilesSelected()
  setFoldersSelected()
})
watch(downloadFiles, setFilesSelected)
watch(downloadFolders, setFoldersSelected)

// Selection Tab
watch(currentSelectionTab, () => {
  if (currentSelectionTab.value?.id === "simple") {
    setCheckboxState()
  } else if (currentSelectionTab.value?.id === "detailed") {
    downloadFiles.value = false
    downloadFolders.value = false
  }

  setFilesSelected()
  setFoldersSelected()
})

// Download
const onDownload = (selectedResources: Resource[]) => {
  const eventParts = ["download-course-page", currentSelectionTab.value?.id]
  if (onlyNewResources.value) {
    eventParts.push("only-new")
  }
  sendEvent(eventParts.join("-"), true, { numberOfFiles: selectedResources.length })
}

// Mark as seen
const onMarkAsSeen = () => {
  sendEvent("mark-as-seen-course-page", true)
  resources.value.forEach((r) => {
    r.isNew = false
    r.isUpdated = false
  })
}

browser.runtime.onMessage.addListener(async (message: object) => {
  const { command } = message as Message
  if (command === "scan-result") {
    const { course } = message as CourseScanResultMessage
    const { resources: detectedResources, activities: detectedActivities } = course
    resources.value = detectedResources.map((r) => ({ ...r, selected: false }))
    activities.value = detectedActivities

    if (nNewAndUpdatedResources.value > 0) {
      onlyNewResources.value = options.value?.onlyNewResources ?? false
    }

    if (nNewActivities.value > 0) {
      if (activeTab.value?.id) {
        browser.tabs.sendMessage(activeTab.value.id, {
          command: "update-activities",
        } as Message)
      }
    }

    setCheckboxState()
    setFilesSelected()
    setFoldersSelected()
  }
})

if (activeTab.value?.id) {
  browser.tabs.sendMessage(activeTab.value.id, {
    command: "scan",
  } as Message)
}
</script>
