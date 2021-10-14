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
        @click="() => onCourseLinkClick(course.link)"
      >
        Go to course
      </div>
    </div>

    <div v-if="hasUpdates">
      <div class="mt-1 text-xs text-gray-700">
        <div v-if="newResources.length > 0" class="font-bold">
          <span>{{ course.counts.nNewFiles + course.counts.nNewFolders }}</span>
          {{ " " }}
          <span>
            {{ course.counts.nNewActivities === 1 ? "new resource" : "new resources" }}
          </span>
        </div>
        <div v-if="newActivities.length > 0" class="font-bold">
          <span>{{ course.counts.nNewActivities }}</span>
          {{ " " }}
          <span>
            {{ course.counts.nNewActivities === 1 ? "new activity" : "new activities" }}
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
            <span v-if="node.isFile" class="break-all">- {{ node.name }} (File)</span>
            <span v-if="node.isFolder" class="break-all">- {{ node.name }} (Folder)</span>
            <span v-if="node.isActivity" class="break-all">
              - {{ node.activityName }} (Activity)
            </span>
          </div>
        </div>
      </div>

      <div class="flex flex-row-reverse items-center justify-between">
        <div
          class="mt-1.5 text-sm text-gray-600 whitespace-nowrap custom-hover"
          @click="() => onMarkAsSeenClick(course)"
        >
          Mark as seen
        </div>
        <button
          v-if="newResources.length > 0"
          class="mt-2 text-sm font-bold btn"
          @click="e => onDownloadClick(e, course)"
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

<script lang="ts">
import { defineComponent, PropType } from "vue"
import {
  DashboardCrawlMessage,
  MarkAsSeenMessage,
  Activity,
  Resource,
  ExtensionOptions,
} from "types"

import Course from "../../models/Course"
import { sendEvent } from "../../shared/helpers"

export default defineComponent({
  props: {
    course: {
      type: Object as PropType<Course>,
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
  data() {
    return {
      showDetails: false,
      resources: this.course.resources,
      activities: this.course.activities,
      counts: this.course.counts,
    }
  },
  computed: {
    newResources(): Resource[] {
      return this.resources.filter(n => n.isNew)
    },
    newActivities(): Activity[] {
      return this.activities.filter(n => n.isNew)
    },
    allNewNodes(): Array<Resource | Activity> {
      return [...this.newResources, ...this.newActivities]
    },
    hasUpdates(): boolean {
      return (
        this.counts.nNewFiles > 0 || this.counts.nNewFolders > 0 || this.counts.nNewActivities > 0
      )
    },
  },
  mounted() {
    if (!this.options) return

    if (this.hasUpdates) {
      this.showDetails = this.options.alwaysShowDetails
    }
  },
  methods: {
    onCourseLinkClick(link: string) {
      sendEvent("go-to-course", true)
      browser.tabs.create({
        url: link,
      })
      window.close()
    },
    onDownloadClick(e: Event, course: Course) {
      sendEvent("download-dashboard-page", true, { numberOfFiles: this.newResources.length })
      const target = e.target as HTMLButtonElement
      target.disabled = true
      if (this?.activeTab?.id) {
        browser.tabs.sendMessage<DashboardCrawlMessage>(this.activeTab.id, {
          command: "crawl",
          link: course.link,
        })
      }
    },
    onMarkAsSeenClick(course: Course) {
      sendEvent("mark-as-seen-dashboard-page", true)
      course.counts.nNewFiles = 0
      course.counts.nNewFolders = 0
      course.counts.nNewActivities = 0
      if (this?.activeTab?.id) {
        browser.tabs.sendMessage<MarkAsSeenMessage>(this.activeTab.id, {
          command: "mark-as-seen",
          link: course.link,
        })
      }
    },
    onDetailClick() {
      this.showDetails = !this.showDetails

      if (this.showDetails) {
        sendEvent("show-details-dashboard-page", true)
      }
    },
  },
})
</script>

<style></style>
