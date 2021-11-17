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
      <div class="px-10 mt-5 font-bold text-center">
        <div>
          Please don't click anything on the page and wait until the download for every video has
          been started.
        </div>
        <div>Downloading many videos concurrently can be very slow.</div>
      </div>
    </template>
  </files-view-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { sendEvent } from "../../shared/helpers"
import { VideoServiceResource, Message, VideoScanResultMessage, Resource } from "../../types"
import FilesViewLayout from "../components/FilesViewLayout.vue"
import DetailedResourceSelection from "../components/DetailedResourceSelection.vue"
import { activeTab, currentSelectionTab } from "../state"

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

const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message
  if (command === "scan-result") {
    const { videoResources: scannedVideoResources } = message as VideoScanResultMessage
    videoResources.value = scannedVideoResources.map((r) => {
      return { ...r, selected: false }
    })

    setVideosSelected()
  }
}
browser.runtime.onMessage.addListener(messageListener)

if (activeTab.value?.id) {
  browser.tabs.sendMessage<Message>(activeTab.value.id, {
    command: "scan",
  })
}
</script>
