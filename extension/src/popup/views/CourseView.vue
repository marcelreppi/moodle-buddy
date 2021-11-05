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
        <span class="ml-1">{{ onlyNewResources ? nNewFiles : nFiles }} file(s) (PDF, etc.)</span>
      </label>
      <label>
        <input v-model="downloadFolders" type="checkbox" :disabled="disableFoldersCb" />
        <span class="ml-1">{{ onlyNewResources ? nNewFolders : nFolders }} folder(s)</span>
      </label>
    </template>

    <template #detailed-selection>
      <detailed-resource-selection :resources="resources" />
    </template>
  </files-view-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { sendEvent } from "../../shared/helpers"
import { isFile, isFolder } from "../../shared/resourceHelpers"
import { Resource, Activity, Message, CourseScanResultMessage } from "../../types"
import FilesViewLayout from "../components/FilesViewLayout.vue"
import DetailedResourceSelection from "../components/DetailedResourceSelection.vue"
import { options, activeTab, currentSelectionTab, onlyNewResources } from "../state"

// Resources
const nFiles = ref(-1)
const nNewFiles = ref(-1)
const nFolders = ref(-1)
const nNewFolders = ref(-1)
const resources = ref<Resource[]>([])
const activities = ref<Activity[]>([])
const nNewResources = computed(() => nNewFiles.value + nNewFolders.value)

// Checkboxes
const downloadFiles = ref(false)
const downloadFolders = ref(false)
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
const setCheckboxState = () => {
  if (onlyNewResources.value) {
    downloadFiles.value = nNewFiles.value !== 0
    downloadFolders.value = nNewFolders.value !== 0
  } else {
    downloadFiles.value = nFiles.value !== 0
    downloadFolders.value = nFolders.value !== 0
  }
}
const setFilesSelected = () =>
  resources.value.filter(isFile).forEach((r) => {
    if (onlyNewResources.value) {
      r.selected = downloadFiles.value && r.isNew
    } else {
      r.selected = downloadFiles.value
    }
  })

const setFoldersSelected = () =>
  resources.value.filter(isFolder).forEach((r) => {
    if (onlyNewResources.value) {
      r.selected = downloadFolders.value && r.isNew
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
  nNewFiles.value = 0
  nNewFolders.value = 0
}

const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message
  if (command === "scan-result") {
    const { course } = message as CourseScanResultMessage
    const { resources: detectedResources, activities: detectedActivities, counts } = course
    nFiles.value = counts.nFiles
    nNewFiles.value = counts.nNewFiles
    nFolders.value = counts.nFolders
    nNewFolders.value = counts.nNewFolders
    resources.value = detectedResources.map((r) => ({ ...r, selected: false }))
    activities.value = detectedActivities

    if (nNewResources.value > 0) {
      onlyNewResources.value = options.value?.onlyNewResources ?? false
    }

    if (counts.nNewActivities > 0) {
      if (activeTab.value?.id) {
        browser.tabs.sendMessage<Message>(activeTab.value.id, {
          command: "update-activities",
        })
      }
    }

    setCheckboxState()
    setFilesSelected()
    setFoldersSelected()
  }
}
browser.runtime.onMessage.addListener(messageListener)

if (activeTab.value?.id) {
  browser.tabs.sendMessage<Message>(activeTab.value.id, {
    command: "scan",
  })
}
</script>
