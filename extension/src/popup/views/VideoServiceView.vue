<template>
  <files-view-layout
    ref="filesView"
    view="videoservice"
    :resources="videoResources"
    @download="onDownload"
  >
    <template #simple-selection>
      <label>
        <input v-model="downloadVideos" type="checkbox" :disabled="disableVideoCb" />
        <span class="ml-1">{{ nVideos }} video(s)</span>
      </label>
    </template>

    <template #detailed-selection>
      <detailed-resource-selection :resources="videoResources" />
    </template>

    <template #download-hint>
      <div class="mt-5 px-3 font-bold text-center text-sm">
        Please don't click anything on the page and wait until the download for every video has been
        started.
        <br />
        Downloading many videos concurrently can be very slow.
      </div>
    </template>
  </files-view-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { sendEvent } from "@shared/helpers"
import { VideoServiceResource, Message, VideoScanResultMessage, Resource } from "@types"
import FilesViewLayout from "../components/FilesViewLayout.vue"
import DetailedResourceSelection from "../components/DetailedResourceSelection.vue"
import { activeTab, currentSelectionTab } from "../state"
import { COMMANDS } from "@shared/constants"

const videoResources = ref<VideoServiceResource[]>([])
const nVideos = computed(() => videoResources.value.length)
const downloadVideos = ref(true)

const disableVideoCb = computed(() => nVideos.value === 0)

const setVideosSelected = () =>
  videoResources.value.forEach((r) => (r.selected = downloadVideos.value))
watch(downloadVideos, setVideosSelected)

// Selection Tab
watch(currentSelectionTab, () => {
  if (currentSelectionTab.value?.id === "simple") {
    downloadVideos.value = true
  } else if (currentSelectionTab.value?.id === "detailed") {
    downloadVideos.value = false
  }

  setVideosSelected()
})

const onDownload = (selectedResources: Resource[]) => {
  const eventParts = ["download-videoservice-page", currentSelectionTab.value?.id]
  sendEvent(eventParts.join("-"), true, { numberOfFiles: selectedResources.length })
}

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message
  if (command === COMMANDS.SCAN_RESULT) {
    const { videoResources: scannedVideoResources } = message as VideoScanResultMessage
    videoResources.value = scannedVideoResources.map((r) => {
      return { ...r, selected: false }
    })

    setVideosSelected()
  }
})

if (activeTab.value?.id) {
  chrome.tabs.sendMessage(activeTab.value.id, {
    command: COMMANDS.INIT_SCAN,
  } satisfies Message)
}
</script>
