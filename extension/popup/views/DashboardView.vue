<template>
  <div class="content-container">
    <div v-if="courses === null" class="text-center">
      <div>Scanning courses for updates...</div>
      <progress-bar ref="progressBar" type="scan"></progress-bar>
    </div>
    <div v-else-if="courses.length === 0" class="text-center">
      <div>No courses found</div>
    </div>
    <div class="flex flex-col items-center px-2 overflow-y-auto max-h-80 scrollbar">
      <course-card
        v-for="(course, i) in courses"
        :key="i"
        :course="course"
        :active-tab="activeTab"
        :options="options"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import {
  DashboardScanResultMessage,
  Message,
  ScanInProgressMessage,
  DashboardCourseData,
} from "../../types"
import { activeTab, options } from "../state"

import { sendEvent } from "../../shared/helpers"

import CourseCard from "../components/CourseCard.vue"
import ProgressBar from "../components/ProgressBar.vue"

export default defineComponent({
  components: {
    CourseCard,
    ProgressBar,
  },
  setup() {
    return {
      activeTab,
      options,
    }
  },
  data() {
    return {
      courses: null as DashboardCourseData[] | null,
    }
  },
  computed: {
    progressBarRef(): any {
      return this.$refs.progressBar as any
    },
  },
  created() {
    const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
      const { command } = message as Message
      if (command === "scan-in-progress") {
        const { total, completed } = message as ScanInProgressMessage
        if (total !== 0) {
          this.progressBarRef.setProgress(total, completed)
        } else {
          this.progressBarRef.resetProgress()
        }
        return
      }

      if (command === "scan-result") {
        const { courses } = message as DashboardScanResultMessage
        this.courses = courses

        if (this.courses.length === 0) {
          sendEvent("empty-dashboard", true)
        }

        this.courses.sort((a, b) => {
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

    if (this?.activeTab?.id) {
      browser.tabs.sendMessage<Message>(this.activeTab.id, {
        command: "scan",
      })
    }
  },
})
</script>

<style></style>
