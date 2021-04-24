<template>
  <div class="content-container">
    <div v-if="loading">Scanning course...</div>
    <div v-else class="content-container">
      <div
        v-if="view === 'course' && showNewActivityInfo"
        class="flex flex-col items-center px-3 text-center"
        id="new-activities"
      >
        <span>The following activities were added to the course:</span>
        <div class="font-semibold" v-for="(node, i) in newActivities" :key="i">
          {{ node.name }}
        </div>
        <hr />
      </div>

      <!-- Resource/Activity Overview -->
      <div class="flex flex-col items-center pt-3">
        <span>
          There
          <span>{{ nResources === 1 ? "is" : "are" }}</span>
          {{ " " }}
          <span class="font-semibold">{{ nResources }}</span>
          {{ " " }}
          <span v-if="view === 'course'" class="font-semibold">
            {{ nResources === 1 ? "resource" : "resources" }}
          </span>
          <span v-if="view === 'videoservice'" class="font-semibold">
            {{ nResources === 1 ? "video" : "videos" }}
          </span>
          available for download
        </span>

        <div
          v-if="view === 'course' && showNewResourceInfo"
          class="flex flex-col items-center mt-2 mb-1"
        >
          <div>
            Since last visit
            <span class="font-semibold">{{ nNewResources }} new</span>
            {{ " " }}
            <span class="font-semibold">{{ nNewResources === 1 ? "resource" : "resources" }}</span>
            {{ " " }}
            <span>{{ nNewResources === 1 ? "was" : "were" }}</span>
            {{ " " }}
            added
          </div>
          <div>
            <label>
              <input v-model="onlyNewResources" type="checkbox" />
              <span class="ml-1">Download only new resources</span>
            </label>
          </div>
          <div class="grid grid-cols-2 mt-1 gap-x-3">
            <div class="action" @click="toggleDetails(true)">Show details</div>
            <div class="action" @click="onMarkAsSeenClick">Mark as seen</div>
          </div>
        </div>
      </div>

      <!-- Resource Selection -->
      <div class="grid w-5/6 grid-cols-2 my-3">
        <div
          class="tab"
          :class="{ 'active-tab': selectionTab === 'simple' }"
          @click="() => setSelectionTab('simple')"
        >
          Simple
        </div>
        <div
          class="tab"
          :class="{ 'active-tab': selectionTab === 'detailed' }"
          @click="() => setSelectionTab('detailed')"
        >
          Detailed
        </div>
      </div>

      <div v-if="selectionTab === 'simple'" class="flex flex-col items-center">
        <div>
          <div v-if="view === 'course'">
            <label>
              <input v-model="downloadFiles" type="checkbox" :disabled="disableFilesCb" />
              <span class="ml-1">
                <span v-if="onlyNewResources">{{ nNewFiles }}</span>
                <span v-else>{{ nFiles }}</span>
                file(s) (PDF, etc.)
              </span>
            </label>
          </div>
          <div v-if="view === 'course'">
            <label>
              <input v-model="downloadFolders" type="checkbox" :disabled="disableFoldersCb" />
              <span class="ml-1">
                <span v-if="onlyNewResources">{{ nNewFolders }}</span>
                <span v-else>{{ nFolders }}</span>
                folder(s)
              </span>
            </label>
          </div>
          <div v-if="view === 'videoservice'">
            <label>
              <input v-model="downloadVideos" type="checkbox" :disabled="disableVideoCb" />
              <span class="ml-1">
                <span>{{ nResources }}</span>
                video(s)
              </span>
            </label>
          </div>
        </div>

        <button
          class="mt-2 text-sm text-gray-600 underline hover:cursor-pointer hover:text-mb-red disabled:text-gray-300 disabled:cursor-default"
          :disabled="disableDownload"
          @click="toggleDetails(false)"
        >
          Show details on selected resources
        </button>
      </div>

      <detailed-selection
        v-else
        :resources="resources"
        :setResourceSelected="setResourceSelected"
        :onlyNewResources="view === 'course' ? onlyNewResources : null"
      />

      <detail-overlay
        v-if="showDetails"
        :resources="showDetailResources"
        :toggle-details="toggleDetails"
      />

      <div v-if="showDownloadOptions" class="mt-5">
        <div>
          <label>
            <input v-model="prependCourseShortcutToFileName" type="checkbox" />
            <span class="ml-1">Prepend course shortcut to each file name</span>
          </label>
        </div>
        <div>
          <label>
            <input v-model="prependCourseToFileName" type="checkbox" />
            <span class="ml-1">Prepend course name to each file name</span>
          </label>
        </div>
      </div>

      <div
        v-if="view === 'videoservice' && downloadInProgress"
        class="px-10 mt-5 font-bold text-center"
      >
        <div>
          Please don't click anything on the page and wait until the download for every video has
          been started.
        </div>
        <div>Downloading many videos concurrently can be very slow.</div>
      </div>

      <progress-bar
        v-if="downloadInProgress"
        ref="progressBar"
        type="download"
        :onDone="onDownloadFinished"
        :onCancel="onDownloadCancel"
        class="w-5/6"
      ></progress-bar>

      <button
        class="py-2 mt-5 font-bold disabled:bg-gray-300 disabled:cursor-default disabled:no-underline btn"
        :disabled="disableDownload"
        @click="onDownload"
      >
        Download
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, ComputedRef, onUpdated, PropType, Ref, ref } from "vue"
import {
  SelectionTab,
  ExtensionOptions,
  CourseCrawlMessage,
  Message,
  DownloadProgressMessage,
  Resource,
} from "moodle-buddy-types"

import DetailOverlay from "../components/DetailOverlay.vue"
import DetailedSelection from "../components/DetailedSelection.vue"
import ProgressBar from "../components/ProgressBar.vue"
import { sendEvent } from "../../shared/helpers"
import useCourseData from "../composables/useCourseData"
import useVideoserviceData from "../composables/useVideoserviceData"

export default {
  components: {
    DetailOverlay,
    DetailedSelection,
    ProgressBar,
  },
  props: {
    view: {
      type: String as PropType<"course" | "videoservice">,
      required: true,
    },
    activeTab: {
      type: Object as PropType<browser.tabs.Tab>,
      required: true,
    },
    options: {
      type: Object as PropType<ExtensionOptions>,
      required: true,
    },
  },
  setup(
    props: Readonly<{
      view: "course" | "videoservice"
      activeTab: browser.tabs.Tab
      options: ExtensionOptions
    }>
  ) {
    const loading = ref(true)

    // Global resource variables
    let nResources: ComputedRef<number>
    let resources: Ref<Resource[]>
    let selectedResources: Ref<Resource[]>
    let newResources: Ref<Resource[]>
    let scanResultHandler: (message: Message) => void

    // Selection tab
    const selectionTab = ref<SelectionTab>("simple")
    const setSelectionTab = (tab: SelectionTab) => {
      selectionTab.value = tab
    }

    // Options
    const showDownloadOptions = ref(props.options.showDownloadOptions)
    const useMoodleFileName = ref(props.options.useMoodleFileName)
    const prependCourseToFileName = ref(props.options.prependCourseToFileName)
    const prependCourseShortcutToFileName = ref(props.options.prependCourseShortcutToFileName)
    const showOptionsPage = () => {
      browser.runtime.openOptionsPage()
    }

    // Detail overlay
    const showDetails = ref(false)
    const showDetailResources = ref<Resource[]>([])
    const setResourceSelected = (href: string, value: boolean) => {
      const resource = resources.value.find((r) => r.href === href)
      if (resource) {
        resource.selected = value
      }
    }
    const toggleDetails = (onlyNew = false) => {
      if (onlyNew) {
        showDetailResources.value = newResources.value
      } else {
        showDetailResources.value = selectedResources.value
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
    let allResourceCbChecked = computed(() => false)
    const disableDownload = computed(() => {
      if (downloadInProgress.value) {
        return true
      }

      if (nResources.value === 0) {
        return true
      }

      if (selectionTab.value === "simple") {
        return allResourceCbChecked.value
      }

      if (selectionTab.value === "detailed") {
        return resources.value.every((r) => !r.selected)
      }

      return false
    })
    let onDownloadCustom: () => void
    const onDownload = () => {
      downloadInProgress.value = true

      onDownloadCustom()

      if (props.activeTab.id) {
        browser.tabs.sendMessage<CourseCrawlMessage>(props.activeTab.id, {
          command: "crawl",
          selectedResources: selectedResources.value.map((r) => ({ ...r })), // Resolve proxy
          options: {
            useMoodleFileName: useMoodleFileName.value,
            prependCourseToFileName: prependCourseToFileName.value,
            prependCourseShortcutToFileName: prependCourseShortcutToFileName.value,
          },
        })
      }
    }

    // Lifecycle hooks
    onUpdated(() => {
      if (downloadInProgress.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const progressBarRef = progressBar.value as any
        // Set initial progress
        progressBarRef.setProgress(selectedResources.value.length)
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let setupReturn: Record<string, any> = {
      loading,
      useMoodleFileName,
      prependCourseToFileName,
      prependCourseShortcutToFileName,
      showDetails,
      showDetailResources,
      showDownloadOptions,
      selectionTab,
      downloadInProgress,
      progressBar,
      setSelectionTab,
      onDownloadFinished,
      disableDownload,
      showOptionsPage,
      setResourceSelected,
      onDownload,
      onDownloadCancel,
      toggleDetails,
    }

    // View-dependent setup
    if (props.view === "course") {
      const courseData = useCourseData(props, selectionTab)
      const {
        nFiles,
        nFolders,
        resources: courseResources,
        downloadFiles,
        downloadFolders,
        newResources: newCourseResources,
        selectedResources: selectedCourseResources,
        scanResultHandler: courseScanResultHandler,
        onDownload: onDownloadCourse,
      } = courseData

      // Overwrite global resource variables
      nResources = computed(() => nFiles.value + nFolders.value)
      resources = courseResources
      selectedResources = selectedCourseResources
      newResources = newCourseResources
      scanResultHandler = courseScanResultHandler

      // Overwrite custom view handlers
      onDownloadCustom = onDownloadCourse
      allResourceCbChecked = computed(() => !downloadFiles.value && !downloadFolders.value)

      setupReturn = {
        ...courseData,
        ...setupReturn,
        nResources,
        resources,
        newResources,
        selectedResources,
        scanResultHandler,
      }
    } else if (props.view === "videoservice") {
      const videoserviceData = useVideoserviceData(selectionTab)
      const {
        nVideos,
        videoResources,
        downloadVideos,
        selectedResources: selectedVideoResources,
        onDownload: onDownloadVideo,
        scanResultHandler: videoScanResultHandler,
      } = videoserviceData

      // Overwrite global resource variables
      nResources = computed(() => nVideos.value)
      resources = videoResources
      selectedResources = selectedVideoResources
      scanResultHandler = videoScanResultHandler

      // Overwrite custom view handlers
      onDownloadCustom = onDownloadVideo
      allResourceCbChecked = computed(() => !downloadVideos.value)

      setupReturn = {
        ...videoserviceData,
        ...setupReturn,
        nResources,
        resources,
        selectedResources,
        scanResultHandler,
      }
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
      const { command } = message as Message
      if (command === "scan-result") {
        scanResultHandler(message as Message)
        loading.value = false
      }

      if (command === "download-progress") {
        const { completed, total, errors } = message as DownloadProgressMessage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const progressBarRef = progressBar.value as any
        progressBarRef.setProgress(total, completed, errors)
      }
    }

    browser.runtime.onMessage.addListener(messageListener)

    if (props.activeTab.id) {
      // Scan for resources
      browser.tabs.sendMessage<Message>(props.activeTab.id, {
        command: "scan",
      })
    }

    return setupReturn
  },
}
</script>

<style scoped>
.tab {
  @apply flex justify-center items-center border-b-[3px] border-gray-300 hover:cursor-pointer text-sm text-gray-600 pb-[0.375rem];
}

.active-tab {
  @apply border-mb-red text-black;
}
</style>