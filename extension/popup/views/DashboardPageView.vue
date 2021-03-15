<template>
  <div class="content-container">
    <div v-if="courses === null" class="no-courses">
      <div>Scanning courses for updates...</div>
      <progress-bar type="scan" ref="progressBar"></progress-bar>
    </div>
    <div v-else-if="courses.length === 0" class="no-courses">
      <div>No courses found</div>
    </div>
    <div v-else class="course-container scrollbar">
      <CourseCard
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
import { defineComponent, PropType } from "vue"
import {
  DashboardScanResultMessage,
  Message,
  ScanInProgressMessage,
  DashboardCourseData,
} from "../../types/messages.types"
import { ExtensionOptions } from "../../types/extension.types"
import { sendEvent } from "../../shared/helpers"

import CourseCard from "../components/CourseCard.vue"
import ProgressBar from "../components/ProgressBar.vue"

export default defineComponent({
  components: {
    CourseCard,
    ProgressBar,
  },
  props: {
    activeTab: {
      type: Object as PropType<browser.tabs.Tab>,
      required: true,
    },
    options: {
      type: Object as PropType<ExtensionOptions>,
      required: true,
    },
  },
  data() {
    return {
      courses: null as DashboardCourseData[] | null,
    }
  },
  computed: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progressBarRef(): any {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.$refs.progressBar as any
    },
  },
  created() {
    // eslint-disable-next-line @typescript-eslint/ban-types
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
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "scan",
      })
    }
  },
})
</script>

<style>
.course-container {
  box-sizing: border-box;
  width: 100%;
  max-height: 300px;
  padding: 0px 10px;
  overflow-y: auto;
}

.no-courses {
  text-align: center;
}
</style>
