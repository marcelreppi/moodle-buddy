<template>
  <div class="flex flex-col w-full px-4 py-3 my-2 border border-gray-200 rounded-md">
    <div class="flex items-start justify-between">
      <div>
        {{ course.name }}
        <div v-if="hasUpdates" class="inline-block w-1.5 h-1.5 mb-2 rounded-full bg-mb-red">
          <!-- Dot -->
        </div>
      </div>
      <div
        class="self-start h-full ml-1 mt-0.5 text-sm text-gray-600 whitespace-nowrap custom-hover"
        @click="() => openCoursePage(course.link)"
      >
        Go to course
      </div>
    </div>

    <div v-if="hasUpdates">
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

      <div class="flex flex-row-reverse items-center justify-between">
        <div
          class="mt-1.5 text-sm text-gray-600 whitespace-nowrap custom-hover"
          @click="onMarkAsSeenClick"
        >
          Mark as seen
        </div>
        <button
          v-if="newResources.length > 0"
          class="mt-2 text-sm font-bold btn"
          @click="(e) => onDownloadClick(e, course)"
        >
          Download new resources
        </button>
      </div>
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
import { DashboardCourseData, DashboardCrawlMessage, MarkAsSeenMessage, Resource } from "types"
import { computed, onMounted, ref } from "vue"
import { sendEvent } from "../../shared/helpers"
import { isFile, isFolder, isActivity } from "../../shared/resourceHelpers"
import useNavigation from "../composables/useNavigation"
import { activeTab, options } from "../state"

const props = defineProps<{
  course: DashboardCourseData
}>()

const emit = defineEmits<{
  (e: "mark-as-seen"): void
}>()

const showDetails = ref(false)

const newResources = computed(() => props.course.resources.filter((n) => n.isNew))
const newActivities = computed(() => props.course.activities.filter((n) => n.isNew))
const allNewNodes = computed(() => [...newResources.value, ...newActivities.value])
const hasUpdates = computed(() => allNewNodes.value.length > 0)

const getResourceLabel = (resource: Resource): string => {
  if (isFile(resource)) return "File"
  if (isFolder(resource)) return "Folder"
  if (isActivity(resource)) return "Activity"

  return "Unknown Type"
}

const { openCoursePage } = useNavigation()

const onDownloadClick = (e: Event, course: DashboardCourseData) => {
  sendEvent("download-dashboard-page", true, { numberOfFiles: newResources.value.length })
  const target = e.target as HTMLButtonElement
  target.disabled = true
  if (activeTab.value?.id) {
    browser.tabs.sendMessage<DashboardCrawlMessage>(activeTab.value.id, {
      command: "crawl",
      link: course.link,
    })
  }
}

const onMarkAsSeenClick = () => {
  sendEvent("mark-as-seen-dashboard-page", true)

  props.course.resources.forEach((r) => (r.isNew = false))
  props.course.counts.nNewFiles = 0
  props.course.counts.nNewFolders = 0
  props.course.counts.nNewActivities = 0

  if (activeTab.value?.id) {
    browser.tabs.sendMessage<MarkAsSeenMessage>(activeTab.value.id, {
      command: "mark-as-seen",
      link: props.course.link,
    })
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
