<template>
  <div class="content-container">
    <div v-if="courses === undefined" class="text-center">
      <div>Scanning courses for updates...</div>
      <progress-bar ref="progressBar" action="scan"></progress-bar>
    </div>
    <div v-else-if="courses.length === 0" class="text-center">
      <div>No courses found</div>
    </div>
    <div class="flex flex-col items-center px-2 overflow-y-auto max-h-80 scrollbar">
      <course-card v-for="(course, i) in courses" :key="i" :course="course" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { sendEvent } from "../../shared/helpers"
import {
  DashboardCourseData,
  DashboardScanResultMessage,
  Message,
  ScanInProgressMessage,
} from "../../types"
import CourseCard from "../components/CourseCard.vue"
import ProgressBar from "../components/ProgressBar.vue"
import { activeTab } from "../state"

const courses = ref<DashboardCourseData[]>()

const progressBar = ref<any>(null)

const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message
  if (command === "scan-in-progress") {
    const { total, completed } = message as ScanInProgressMessage
    if (total !== 0) {
      progressBar.value.setProgress(total, completed)
    } else {
      progressBar.value.resetProgress()
    }
    return
  }

  if (command === "scan-result") {
    const { courses: dashboardCourses } = message as DashboardScanResultMessage
    courses.value = dashboardCourses

    if (courses.value.length === 0) {
      sendEvent("empty-dashboard", true)
    }

    courses.value.sort((a, b) => {
      if (
        a.counts.nNewFiles > b.counts.nNewFiles ||
        a.counts.nNewFolders > b.counts.nNewFolders ||
        a.counts.nNewActivities > b.counts.nNewActivities
      ) {
        return -1
      }

      if (
        a.counts.nNewFiles < b.counts.nNewFiles ||
        a.counts.nNewFolders < b.counts.nNewFolders ||
        a.counts.nNewActivities < b.counts.nNewActivities
      ) {
        return 1
      }

      return 0
    })
  }
}
browser.runtime.onMessage.addListener(messageListener)

if (activeTab.value?.id) {
  browser.tabs.sendMessage<Message>(activeTab.value.id, {
    command: "scan",
  })
}
</script>

<style></style>
