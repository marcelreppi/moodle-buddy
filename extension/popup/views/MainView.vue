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
        :onCancel="onCancel"
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
import { computed, onUpdated, PropType, ref } from "vue"
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
    const useMoodleFileName = ref(false)
    const prependCourseToFileName = ref(false)
    const prependCourseShortcutToFileName = ref(false)
    const showDetails = ref(false)
    const showDetailResources = ref<Resource[]>([])
    const showDownloadOptions = ref(true)
    const selectionTab = ref<SelectionTab>("simple")
    const downloadInProgress = ref(false)
    const downloadProgressText = ref("")
    const progressBar = ref(null)

    let nResources = ref(0)
    let resources = ref<Resource[]>([])
    let selectedResources = ref<Resource[]>([])
    let newResources = ref<Resource[]>([])

    let scanResultHandler: (message: Message) => void

    const setSelectionTab = (tab: SelectionTab) => {
      selectionTab.value = tab
    }

    const onDownloadFinished = () => {
      setTimeout(() => {
        downloadInProgress.value = false
      }, 3000)
    }

    const showOptionsPage = () => {
      browser.runtime.openOptionsPage()
    }

    const setResourceSelected = (href: string, value: boolean) => {
      const resource = resources.value.find((r) => r.href === href)
      if (resource) {
        resource.selected = value
      }
    }

    const onCancel = () => {
      browser.runtime.sendMessage<Message>({
        command: "cancel-download",
      })
      downloadInProgress.value = false
      sendEvent("cancel-download", true)
    }

    let disableDownload = computed(() => {
      if (downloadInProgress.value) {
        return true
      }

      if (nResources.value === 0) {
        return true
      }

      if (selectionTab.value === "detailed") {
        return resources.value.every((r) => !r.selected)
      }

      return false
    })

    const onDownloadCommon = () => {
      downloadInProgress.value = true

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

    onUpdated(() => {
      if (downloadInProgress.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const progressBarRef = progressBar.value as any
        progressBarRef.setProgress(selectedResources.value.length)
      }
    })

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
      downloadProgressText,
      progressBar,
      setSelectionTab,
      onDownloadFinished,
      disableDownload,
      showOptionsPage,
      setResourceSelected,
      onCancel,
      toggleDetails,
    }

    if (props.view === "course") {
      const {
        nFiles,
        nNewFiles,
        nFolders,
        nNewFolders,
        nActivities,
        nNewActivities,
        resources: courseResources,
        activities,
        downloadFiles,
        downloadFolders,
        onlyNewResources,
        nResources: nCourseResources,
        nNewResources,
        newResources: newCourseResources,
        newActivities,
        selectedResources: selectedCourseResources,
        showNewResourceInfo,
        showNewActivityInfo,
        disableFilesCb,
        disableFoldersCb,
        scanResultHandler: courseScanResultHandler,
        disableDownload: disableDownloadCourse,
        onDownload: onDownloadCourse,
      } = useCourseData(props, selectionTab)

      nResources = nCourseResources
      resources = courseResources
      selectedResources = selectedCourseResources
      newResources = newCourseResources
      scanResultHandler = courseScanResultHandler

      const onMarkAsSeenClick = () => {
        sendEvent("mark-as-seen-course-page", true)
        onlyNewResources.value = false
        nNewFiles.value = 0
        nNewFolders.value = 0
        nNewActivities.value = 0
        if (props.activeTab.id) {
          browser.tabs.sendMessage<Message>(props.activeTab.id, {
            command: "mark-as-seen",
          })
        }
      }

      disableDownload = computed(() => {
        if (downloadInProgress.value) {
          return true
        }

        if (nResources.value === 0) {
          return true
        }

        if (selectionTab.value === "simple") {
          return disableDownloadCourse.value
        }

        if (selectionTab.value === "detailed") {
          return resources.value.every((r) => !r.selected)
        }

        return false
      })

      const onDownload = () => {
        onDownloadCommon()
        onDownloadCourse()
      }

      setupReturn = {
        ...setupReturn,
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
        nResources,
        nNewResources,
        newResources,
        newActivities,
        selectedResources,
        showNewResourceInfo,
        showNewActivityInfo,
        disableFilesCb,
        disableFoldersCb,
        scanResultHandler,
        disableDownload,
        onMarkAsSeenClick,
        onDownload,
      }
    } else if (props.view === "videoservice") {
      const {
        nVideos,
        videoResources,
        downloadVideos,
        selectedResources: selectedVideoResources,
        disableVideoCb,
        onDownload: onDownloadVideo,
        scanResultHandler: videoScanResultHandler,
      } = useVideoserviceData(selectionTab)

      nResources = nVideos
      resources = videoResources
      selectedResources = selectedVideoResources
      scanResultHandler = videoScanResultHandler

      disableDownload = computed(() => {
        if (downloadInProgress.value) {
          return true
        }

        if (nResources.value === 0) {
          return true
        }

        if (selectionTab.value === "simple") {
          return !downloadVideos.value
        }

        if (selectionTab.value === "detailed") {
          return resources.value.every((r) => !r.selected)
        }

        return false
      })

      const onDownload = () => {
        onDownloadCommon()
        onDownloadVideo()
      }

      setupReturn = {
        ...setupReturn,
        nResources,
        resources,
        selectedResources,
        scanResultHandler,
        onDownload,
        downloadVideos,
        disableVideoCb,
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

    showDownloadOptions.value = props.options.showDownloadOptions
    useMoodleFileName.value = props.options.useMoodleFileName
    prependCourseToFileName.value = props.options.prependCourseToFileName
    prependCourseShortcutToFileName.value = props.options.prependCourseShortcutToFileName

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
