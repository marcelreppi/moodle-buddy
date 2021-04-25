<template>
  <div class="content-container">
    <div v-if="courses === null" class="text-center">
      <div>Scanning courses for updates...</div>
      <progress-bar ref="progressBar" type="scan"></progress-bar>
    </div>
    <div v-else-if="courses.length === 0" class="text-center">
      <div>No courses found</div>
    </div>
    <selection-tab
      v-else
      class="w-full px-3"
      :tabs="selectionTabs"
      :selection-tab="selectionTab"
      :set-selection-tab="setSelectionTab"
    >
      <template #updates>
        <div class="flex flex-col items-center px-2 overflow-y-auto max-h-80 scrollbar">
          <course-card
            v-for="(course, i) in courses"
            :key="i"
            :course="course"
            :active-tab="activeTab"
            :options="options"
          />
        </div>
      </template>
      <template #download>
        <div class="flex flex-col items-center">
          <detailed-selection :courses="courses"></detailed-selection>

          <progress-bar
            v-if="downloadInProgress"
            ref="progressBar"
            type="download"
            :on-done="onDownloadFinished"
            :on-cancel="onDownloadCancel"
            class="w-5/6"
          ></progress-bar>

          <!-- <button class="py-2 mt-5 font-bold btn" :disabled="disableDownload" @click="onDownload"> -->
          <button class="py-2 mt-5 font-bold btn">Download</button>
        </div>
      </template>
    </selection-tab>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import {
  DashboardScanResultMessage,
  Message,
  ScanInProgressMessage,
  DashboardCourseData,
  ExtensionOptions,
} from "moodle-buddy-types"

import { sendEvent } from "../../shared/helpers"
import useSelectionTab from "../composables/useSelectionTab"

import CourseCard from "../components/CourseCard.vue"
import ProgressBar from "../components/ProgressBar.vue"
import SelectionTab from "../components/SelectionTab.vue"
import DetailedSelection from "../components/DetailedCourseSelection.vue"

export default defineComponent({
  components: {
    CourseCard,
    ProgressBar,
    SelectionTab,
    DetailedSelection,
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
  setup() {
    // Selection Tab
    const { selectionTab, selectionTabs, setSelectionTab } = useSelectionTab([
      {
        id: "updates",
        title: "Updates",
      },
      {
        id: "download",
        title: "Download",
      },
    ])

    return {
      selectionTab,
      selectionTabs,
      setSelectionTab,
    }
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
      browser.tabs.sendMessage<Message>(this.activeTab.id, {
        command: "scan",
      })
    }
  },
})
</script>

<style></style>
