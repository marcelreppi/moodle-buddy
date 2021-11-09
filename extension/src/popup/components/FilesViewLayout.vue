<template>
  <div class="content-container pb-5">
    <div v-if="loading">Scanning course...</div>
    <div v-else class="content-container">
      <div
        v-if="showNewActivityInfo"
        id="new-activities"
        class="flex flex-col items-center px-3 text-center"
      >
        <span>The following activities were added to the course:</span>
        <div v-for="(node, i) in newActivities" :key="i" class="font-semibold">
          {{ node.name }}
        </div>
        <hr />
      </div>

      <!-- Resource/Activity Overview -->
      <div class="flex flex-col items-center pt-3 text-center">
        <span>
          There
          {{ nResources === 1 ? "is" : "are" }}
          <span class="font-semibold">{{ nResources }}</span>
          {{ " " }}
          <span class="font-semibold">
            {{ view === "course" ? (nResources === 1 ? "resource" : "resources") : "" }}
            {{ view === "videoservice" ? (nResources === 1 ? "video" : "videos") : "" }}
          </span>
          available for download
        </span>

        <div
          v-if="showNewResourceInfo || showUpdatedResourceInfo"
          class="flex flex-col items-center mt-2 mb-1"
        >
          <div>
            Since last visit
            <template v-if="showNewResourceInfo">
              <span class="font-semibold">
                {{ nNewResources }}
                <span class="underline">new</span>
              </span>
              {{ " " }}
              <span class="font-semibold">
                {{ nNewResources === 1 ? "resource" : "resources" }}
              </span>
              {{ " " }}
              <span>{{ nNewResources === 1 ? "was" : "were" }}</span>
              {{ " " }}
              added
            </template>

            <span v-if="showNewResourceInfo && showUpdatedResourceInfo">
              <br />
              and
            </span>

            <template v-if="showUpdatedResourceInfo">
              <span class="font-semibold">
                {{ nUpdatedResources }}
                <span class="underline">old</span>
              </span>
              {{ " " }}
              <span class="font-semibold">
                {{ nUpdatedResources === 1 ? "resource" : "resources" }}
              </span>
              {{ " " }}
              <span>{{ nUpdatedResources === 1 ? "was" : "were" }}</span>
              {{ " " }}
              updated
            </template>
          </div>
          <div>
            <label>
              <input v-model="onlyNewResources" type="checkbox" />
              <span class="ml-1">Download only new resources</span>
            </label>
          </div>
          <div class="grid grid-cols-2 mt-1 gap-x-3">
            <div
              class="hover:cursor-pointer hover:text-mb-red hover:underline"
              @click="toggleDetails(true)"
            >
              Show details
            </div>
            <div
              class="hover:cursor-pointer hover:text-mb-red hover:underline"
              @click="onMarkAsSeenClick"
            >
              Mark as seen
            </div>
          </div>
        </div>
      </div>

      <!-- Resource Selection -->
      <selection-tab class="w-5/6" :tabs="selectionTabs">
        <template #simple>
          <div class="flex flex-col items-center">
            <slot name="simple-selection"></slot>

            <button
              class="mt-2 text-sm text-gray-600 underline hover:cursor-pointer hover:text-mb-red disabled:text-gray-300 disabled:cursor-default"
              :disabled="disableDownload"
              @click="toggleDetails(false)"
            >
              Show details on selected resources
            </button>
          </div>
        </template>
        <template #detailed>
          <slot name="detailed-selection"></slot>
        </template>
      </selection-tab>

      <div v-if="showDownloadOptions" class="mt-5">
        <div>
          <label>
            <input v-model="prependCourseShortcutToFileName" type="checkbox" />
            <span class="ml-1">Prepend course shortcut to each file name</span>
          </label>
        </div>
        <div>
          <label>
            <input v-model="prependCourseNameToFileName" type="checkbox" />
            <span class="ml-1">Prepend course name to each file name</span>
          </label>
        </div>
        <div>
          <label>
            <input v-model="prependSectionToFileName" type="checkbox" />
            <span class="ml-1">Prepend section name to each file name</span>
          </label>
        </div>
        <div>
          <label>
            <input v-model="prependSectionIndexToFileName" type="checkbox" />
            <span class="ml-1">
              Prepend section index to each file name (a number in the order that the sections
              appear in the course)
            </span>
          </label>
        </div>
        <div>
          <label>
            <input v-model="prependFileIndexToFileName" type="checkbox" />
            <span class="ml-1">
              Prepend file index to each file name (a number in the order that the files appear in
              the course)
            </span>
          </label>
        </div>
      </div>

      <slot v-if="downloadInProgress" name="download-hint"></slot>

      <progress-bar
        v-if="downloadInProgress"
        ref="progressBar"
        action="download"
        :on-done="onDownloadFinished"
        :on-cancel="onDownloadCancel"
        class="w-5/6"
      ></progress-bar>

      <button class="py-2 mt-5 font-bold btn" :disabled="disableDownload" @click="onDownload">
        Download
      </button>
    </div>

    <detail-overlay
      v-if="showDetails"
      :resources="showDetailResources"
      :toggle-details="toggleDetails"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onUpdated, ref } from "vue"
import DetailOverlay from "./DetailOverlay.vue"
import ProgressBar from "./ProgressBar.vue"
import SelectionTab from "./SelectionTab.vue"
import defaultExtensionOptions from "../../shared/defaultExtensionOptions"
import { sendEvent } from "../../shared/helpers"
import { isFile, isFolder, isVideoServiceVideo } from "../../shared/resourceHelpers"
import {
  Activity,
  CourseCrawlMessage,
  DownloadProgressMessage,
  Message,
  Resource,
} from "../../types"
import { activeTab, options, onlyNewResources } from "../state"

type SupportedView = "course" | "videoservice"

const props = defineProps<{
  view: SupportedView
  resources: Resource[]
  activities?: Activity[]
}>()

const emit = defineEmits<{
  (e: "mark-as-seen"): void
  (e: "download", selectedResources: Resource[]): void
}>()

const loading = ref(true)

// Options
const showDownloadOptions = computed(() => options.value?.showDownloadOptions)
const useMoodleFileName = computed(() => options.value?.useMoodleFileName)
const prependCourseNameToFileName = computed(() => options.value?.prependCourseNameToFileName)
const prependCourseShortcutToFileName = computed(
  () => options.value?.prependCourseShortcutToFileName
)
const prependSectionToFileName = computed(() => options.value?.prependSectionToFileName)
const prependSectionIndexToFileName = computed(() => options.value?.prependSectionIndexToFileName)
const prependFileIndexToFileName = computed(() => options.value?.prependFileIndexToFileName)

// Resource data
const resources = computed(() =>
  props.resources.filter((r) => isFile(r) || isFolder(r) || isVideoServiceVideo(r))
)
const nResources = computed(() => resources.value.length)
const selectedResources = computed(() => resources.value.filter((r) => r.selected))

const newResources = computed(() => resources.value.filter((r) => r.isNew))
const nNewResources = computed(() => newResources.value.length)
const showNewResourceInfo = computed(() => nNewResources.value > 0)

const updatedResources = computed(() => resources.value.filter((r) => r.isUpdated))
const nUpdatedResources = computed(() => updatedResources.value.length)
const showUpdatedResourceInfo = computed(() => nUpdatedResources.value > 0)

// Activity data
const newActivities = computed(() => props.activities?.filter((n) => n.isNew) ?? [])
const showNewActivityInfo = computed(() => newActivities.value.length > 0)

// Mark as seen
const onMarkAsSeenClick = () => {
  onlyNewResources.value = false
  emit("mark-as-seen")

  if (activeTab.value?.id) {
    browser.tabs.sendMessage<Message>(activeTab.value.id, {
      command: "mark-as-seen",
    })
  }
}

// Selection Tab
const selectionTabs = [
  {
    id: "simple",
    title: "Simple",
  },
  {
    id: "detailed",
    title: "Detailed",
  },
]

// Detail overlay
const showDetails = ref(false)
const showDetailResources = ref<Resource[]>([])

const toggleDetails = (onlyNew = false) => {
  showDetailResources.value = selectedResources.value

  if (onlyNew) {
    showDetailResources.value = newResources.value
  }

  showDetails.value = !showDetails.value

  if (showDetails.value) {
    sendEvent("show-details-course-page", true)
  }
}

// Download functionality
const downloadInProgress = ref(false)
const progressBar = ref(null)
const onDownloadFinished = () => {
  setTimeout(() => {
    downloadInProgress.value = false
  }, 3000)
}
const onDownloadCancel = () => {
  browser.runtime.sendMessage<Message>({
    command: "cancel-download",
  })
  downloadInProgress.value = false
  sendEvent("cancel-download", true)
}

const disableDownload = computed(() => {
  if (downloadInProgress.value) {
    return true
  }

  if (nResources.value === 0) {
    return true
  }

  return resources.value.every((r) => !r.selected)
})

const onDownload = () => {
  downloadInProgress.value = true

  emit("download", selectedResources.value)

  if (activeTab.value?.id) {
    browser.tabs.sendMessage<CourseCrawlMessage>(activeTab.value.id, {
      command: "crawl",
      selectedResources: selectedResources.value.map((r) => ({ ...r })), // Resolve proxy
      options: {
        useMoodleFileName: useMoodleFileName.value ?? defaultExtensionOptions.useMoodleFileName,
        prependCourseNameToFileName:
          prependCourseNameToFileName.value ?? defaultExtensionOptions.prependCourseNameToFileName,
        prependCourseShortcutToFileName:
          prependCourseShortcutToFileName.value ??
          defaultExtensionOptions.prependCourseShortcutToFileName,
        prependSectionToFileName:
          prependSectionToFileName.value ?? defaultExtensionOptions.prependSectionToFileName,
        prependSectionIndexToFileName:
          prependSectionIndexToFileName.value ??
          defaultExtensionOptions.prependSectionIndexToFileName,
        prependFileIndexToFileName:
          prependFileIndexToFileName.value ?? defaultExtensionOptions.prependFileIndexToFileName,
      },
    })
  }
}

const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message
  if (command === "scan-result") {
    loading.value = false
  }

  if (command === "download-progress") {
    const { completed, total, errors } = message as DownloadProgressMessage
    const progressBarRef = progressBar.value as any
    progressBarRef.setProgress(total, completed, errors)
  }
}
browser.runtime.onMessage.addListener(messageListener)

// Lifecycle hooks
onUpdated(() => {
  if (downloadInProgress.value) {
    const progressBarRef = progressBar.value as any
    // Set initial progress
    progressBarRef.setProgress(selectedResources.value.length)
  }
})
</script>

<style scoped>
.tab {
  @apply flex justify-center items-center border-b-[3px] border-gray-300 hover:cursor-pointer text-sm text-gray-600 pb-1.5;
}

.active-tab {
  @apply border-mb-red text-black;
}
</style>
