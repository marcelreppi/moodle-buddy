<template>
  <div class="flex flex-col w-full px-4 py-3 my-2 border border-gray-200 rounded-md">
    <div class="flex items-start justify-between">
      <div>
        {{ course.name }}
        <div v-if="hasUpdates" class="inline-block w-1.5 h-1.5 mb-2 rounded-full bg-mb-red">
          <!-- Dot -->
        </div>
        <button
          ref="downloadCourseButton"
          v-if="!isDownloadInProgress"
          class="btn btn-xs btn-ghost"
          @click="onDownloadCourse"
        >
          <ArrowDownTrayIcon class="size-4"></ArrowDownTrayIcon>
        </button>
      </div>
      <div v-if="!isDownloadInProgress" class="flex flex-nowrap">
        <button
          ref="markAsSeenButton"
          v-if="hasUpdates"
          class="btn btn-xs btn-ghost"
          @click="onMarkAsSeenClick"
        >
          <CheckIcon class="size-4"></CheckIcon>
        </button>
        <button
          ref="openCourseButton"
          class="btn btn-xs btn-ghost"
          @click="onOpenCourse"
        >
          <ArrowTopRightOnSquareIcon class="size-4"></ArrowTopRightOnSquareIcon>
        </button>
      </div>
    </div>

    <progress-bar
      v-if="isDownloadInProgress"
      ref="progressBar"
      action="download"
      :cancelable="false"
      :is-pending="downloadState?.isPending"
      class="w-5/6"
    ></progress-bar>

    <div v-else-if="hasUpdates">
      <div class="mt-1 text-xs text-gray-700">
        <div v-if="newResources.length > 0" class="font-bold">
          <span>{{ newResources.length }}</span>
          {{ " " }}
          <span>
            {{ newResources.length === 1 ? "new resource" : "new resources" }}
          </span>
        </div>
        <div v-if="newActivities.length > 0" class="font-bold">
          <span>{{ newActivities.length }}</span>
          {{ " " }}
          <span>
            {{ newActivities.length === 1 ? "new activity" : "new activities" }}
          </span>
        </div>
        <div class="flex items-center ml-1 mt-0.5" @click="onDetailClick">
          <div
            ref="arrow"
            class="transition-all mr-1.5 -ml-1 w-1.5 h-1.5 border-t-2 border-black border-r-2 transform"
            :class="showDetails ? 'rotate-[135deg] -mt-0.5' : 'rotate-45'"
          />
          <div class="custom-hover">{{ showDetails ? "Hide" : "Show" }} details</div>
        </div>
        <div v-if="showDetails" class="pl-4 mt-1 text-xs text-gray-600">
          <div v-for="(node, i) in allNewNodes" :key="i">
            <span class="break-all">{{ node.name }} ({{ getResourceLabel(node) }})</span>
          </div>
        </div>
      </div>

      <button
        v-if="newResources.length > 0"
        :key="course.link"
        class="mt-2 btn btn-primary btn-sm"
        @click="onDownloadNewClick"
      >
        Download new resources
      </button>
    </div>

    <div v-else class="mt-1 text-xs text-gray-600">
      <div v-if="course.isNew">
        Scanned for the first time.
        <br />
        Updates will be shown on your next visit.
      </div>
      <div v-else>No new updates</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useTippy } from "vue-tippy"
import {
  DashboardCourseData,
  DashboardDownloadCourseMessage,
  DownloadProgressMessage,
  MarkAsSeenMessage,
  Resource,
} from "types"
import { sendEvent } from "@shared/helpers"
import { isFile, isFolder, isActivity } from "@shared/resourceHelpers"
import useNavigation from "../composables/useNavigation"
import { activeTab, options } from "../state"
import ArrowTopRightOnSquareIcon from "@heroicons/vue/24/outline/ArrowTopRightOnSquareIcon"
import CheckIcon from "@heroicons/vue/24/outline/CheckIcon"
import ProgressBar from "./ProgressBar.vue"
import { COMMANDS } from "@shared/constants"
import { ArrowDownTrayIcon } from "@heroicons/vue/24/outline"

const downloadCourseButton = ref()
useTippy(downloadCourseButton, { content: "Download course" })

const markAsSeenButton = ref()
useTippy(markAsSeenButton, { content: "Mark as seen" })

const openCourseButton = ref()
useTippy(openCourseButton, { content: "Open course" })

const props = defineProps<{
  course: DashboardCourseData
  downloadState?: DownloadProgressMessage
}>()

const emit = defineEmits<{
  (e: "mark-as-seen"): void
}>()

const showDetails = ref(false)

const newResources = computed(() => props.course.resources.filter((n) => n.isNew))
const newActivities = computed(() => props.course.activities.filter((n) => n.isNew))
const allNewNodes = computed(() => [...newResources.value, ...newActivities.value])
const hasUpdates = computed(() => allNewNodes.value.length > 0)

const progressBar = ref<InstanceType<typeof ProgressBar> | null>(null)
const isDownloadInProgress = computed(() => !!props.downloadState)
watch(() => props.downloadState, () => {
  if (props.downloadState && progressBar.value) {
    progressBar.value.setProgress(
      props.downloadState.total,
      props.downloadState.completed,
      props.downloadState.errors
    )
  }
})

const getResourceLabel = (resource: Resource): string => {
  if (isFile(resource)) return "File"
  if (isFolder(resource)) return "Folder"
  if (isActivity(resource)) return "Activity"

  return "Unknown Type"
}

const { openCoursePage } = useNavigation()

function onOpenCourse() {
  openCoursePage(props.course.link)
}

function onDownloadCourse() {
  if (activeTab.value?.id) {
    chrome.tabs.sendMessage(activeTab.value.id, {
      command: COMMANDS.DASHBOARD_DOWNLOAD_COURSE,
      link: props.course.link,
    } satisfies DashboardDownloadCourseMessage)
  }
}

const onDownloadNewClick = (e: Event) => {
  sendEvent("download-dashboard-page", true, { numberOfFiles: newResources.value.length })
  const target = e.target as HTMLButtonElement
  target.disabled = true
  if (activeTab.value?.id) {
    chrome.tabs.sendMessage(activeTab.value.id, {
      command: COMMANDS.DASHBOARD_DOWNLOAD_NEW,
      link: props.course.link,
    } satisfies DashboardDownloadCourseMessage)
  }
}

const onMarkAsSeenClick = () => {
  sendEvent("mark-as-seen-dashboard-page", true)

  props.course.resources.forEach((r) => (r.isNew = false))
  props.course.activities.forEach((a) => (a.isNew = false))

  if (activeTab.value?.id) {
    chrome.tabs.sendMessage(activeTab.value.id, {
      command: COMMANDS.MARK_AS_SEEN,
      link: props.course.link,
    } satisfies MarkAsSeenMessage)
  }

  emit("mark-as-seen")
}

const onDetailClick = () => {
  showDetails.value = !showDetails.value

  if (showDetails.value) {
    sendEvent("show-details-dashboard-page", true)
  }
}

onMounted(() => {
  if (!options.value) return

  if (hasUpdates.value) {
    showDetails.value = options.value.alwaysShowDetails
  }
})
</script>

<style></style>
