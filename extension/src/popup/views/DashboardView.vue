<template>
  <div class="content-container">
    <div v-if="courses === undefined" class="text-center">
      <div>Scanning courses for updates...</div>
      <progress-bar ref="progressBar" action="scan" :cancelable="false"></progress-bar>
    </div>
    <div v-else-if="courses.length === 0" class="text-center">
      <div>No courses found</div>
    </div>
    <template v-else>
      <div class="flex flex-col items-center px-2 overflow-y-auto w-full max-h-80 scrollbar">
        <course-card
          v-for="(course, i) in courses"
          :key="course.link"
          :course="course"
          :download-state="downloadState[course.link]"
          @mark-as-seen="sortCoursesByNewestResourcesAndActivities"
        />
      </div>
      <button
        class="btn btn-xs btn-primary w-1/2 mt-3"
        @click="onDownloadAll"
        :disabled="downloadAllInProgress"
      >
        Download all
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue"
import { getCourseDownloadId, sendEvent } from "@shared/helpers"
import {
  DashboardCourseData,
  DashboardUpdateCourseMessage,
  DashboardScanResultMessage,
  DownloadProgressMessage,
  Message,
  ScanInProgressMessage,
} from "@types"
import CourseCard from "../components/CourseCard.vue"
import ProgressBar from "../components/ProgressBar.vue"
import { activeTab } from "../state"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

const courses = ref<DashboardCourseData[]>()

const progressBar = ref<InstanceType<typeof ProgressBar> | null>(null)

const downloadAllInProgress = ref(false)
let downloadState = reactive<Record<string, DownloadProgressMessage | undefined>>({})

const sortCoursesByNewestResourcesAndActivities = () => {
  const getTotalCourseUpdates = (course: DashboardCourseData) =>
    [...course.resources, ...course.activities].filter((r) => r.isNew || r.isUpdated).length

  courses.value?.sort((c1: DashboardCourseData, c2: DashboardCourseData) => {
    const c1Updates = getTotalCourseUpdates(c1)
    const c2Updates = getTotalCourseUpdates(c2)

    if (c1Updates > c2Updates) return -1
    if (c1Updates < c2Updates) return 1
    return 0
  })
}

function isDownloadDone(course: DashboardCourseData) {
  return downloadState[course.link]?.isDone
}

async function onDownloadAll() {
  if (!activeTab?.value?.id) {
    logger.debug("Failed to get active tab id")
    return
  }

  if (!courses.value || courses.value.length === 0) {
    logger.debug("No courses found to download all")
    return
  }

  sendEvent("dashboard-download-all")

  // Initialize download state
  downloadAllInProgress.value = true
  Object.keys(downloadState).forEach((key) => {
    Object.assign(downloadState, { [key]: undefined })
  })
  courses.value.forEach((course) => {
    const initialDownloadState: DownloadProgressMessage = {
      command: COMMANDS.DOWNLOAD_PROGRESS,
      id: getCourseDownloadId(COMMANDS.DASHBOARD_DOWNLOAD_COURSE, course),
      courseLink: course.link,
      courseName: course.name,
      errors: 0,
      total: course.resources.length,
      completed: 0,
      isDone: false,
      isPending: true,
    }
    Object.assign(downloadState, { [course.link]: initialDownloadState })
  })

  // Trigger download one by one
  for (const course of courses.value) {
    let courseDownloadState = downloadState[course.link]
    if (!courseDownloadState) {
      logger.error(`Failed to get download state for course ${course.name}`)
      continue
    }

    courseDownloadState.isPending = false
    Object.assign(downloadState, { [course.link]: courseDownloadState })

    chrome.tabs.sendMessage(activeTab.value.id, {
      command: COMMANDS.DASHBOARD_DOWNLOAD_COURSE,
      link: course.link,
    } as Message)

    while (!isDownloadDone(course)) {
      logger.debug(`Waiting for download to complete ${courseDownloadState.id}`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    logger.info(`Download complete ${courseDownloadState.id}`)
  }

  setTimeout(() => {
    downloadAllInProgress.value = false
  }, 2000)
}

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message
  if (command === COMMANDS.SCAN_IN_PROGRESS) {
    const { total, completed } = message as ScanInProgressMessage
    if (total !== 0) {
      progressBar.value?.setProgress(total, completed)
    } else {
      progressBar.value?.resetProgress()
    }
    return
  }

  if (command === COMMANDS.SCAN_RESULT) {
    const { courses: dashboardCourses } = message as DashboardScanResultMessage
    courses.value = dashboardCourses

    if (courses.value.length === 0) {
      sendEvent("empty-dashboard", true)
    }

    sortCoursesByNewestResourcesAndActivities()
  }

  if (command === COMMANDS.DOWNLOAD_PROGRESS) {
    const downloadProgressMessage = message as DownloadProgressMessage
    logger.debug(`Download progress ${downloadProgressMessage.courseName}`, downloadProgressMessage)
    Object.assign(downloadState, {
      [downloadProgressMessage.courseLink]: downloadProgressMessage,
    })

    if (downloadProgressMessage.isDone) {
      setTimeout(
        () =>
          Object.assign(downloadState, {
            [downloadProgressMessage.courseLink]: undefined,
          }),
        2000
      )
    }
  }

  if (command === COMMANDS.DASHBOARD_UPDATE_COURSE) {
    const { course } = message as DashboardUpdateCourseMessage
    if (!courses.value) {
      logger.debug(`Courses are undefined. Can't update course ${course.name}`)
      return
    }

    logger.debug(`Updating course ${course.name}`)
    const courseIndex = courses.value.findIndex((c) => c.link === course.link)
    if (courseIndex !== -1) {
      courses.value.splice(courseIndex, 1, course)
    }
  }
})

if (activeTab.value?.id) {
  chrome.tabs.sendMessage(activeTab.value.id, {
    command: COMMANDS.INIT_SCAN,
  } satisfies Message)
}
</script>

<style></style>
