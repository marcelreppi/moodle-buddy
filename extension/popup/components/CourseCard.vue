<template>
  <div class="course-card">
    <div class="course-name">
      <div :class="{ 'update-name': hasUpdates }">{{ course.name }}</div>
      <div class="course-link action" @click="() => onCourseLinkClick(course.link)">
        Go to course
      </div>
    </div>

    <div v-if="hasUpdates">
      <div class="course-details">
        <div v-if="newResources.length > 0" class="update-details">
          <span>{{ course.counts.nNewFiles + course.counts.nNewFolders }}</span>
          <span v-if="course.counts.nNewFiles + course.counts.nNewFolders === 1">new resource</span>
          <span v-else>new resources</span>
        </div>
        <div v-if="newActivities.length > 0" class="update-details">
          <span>{{ course.counts.nNewActivities }}</span>
          <span v-if="course.counts.nNewActivities === 1">new activity</span>
          <span v-else>new activities</span>
        </div>
        <div class="detail-switch" @click="onDetailClick">
          <div ref="arrow" class="arrow" />
          <div class="switch-text">{{ showDetails ? "Hide" : "Show" }} details</div>
        </div>
        <div v-if="showDetails" class="detail-container">
          <div v-for="(node, i) in allNewNodes" :key="i">
            <span v-if="node.isFile" class="filename">- {{ node.name }} (File)</span>
            <span v-if="node.isFolder" class="filename">- {{ node.name }} (Folder)</span>
            <span v-if="node.isActivity" class="filename">
              - {{ node.activityName }} (Activity)
            </span>
          </div>
        </div>
      </div>

      <div class="download-row">
        <div class="action" @click="() => onMarkAsSeenClick(course)">Mark as seen</div>
        <button
          v-if="newResources.length > 0"
          class="download-button"
          @click="e => onDownloadClick(e, course)"
        >
          Download new resources
        </button>
      </div>
    </div>
    <div v-else-if="course.isNew" class="course-details">
      Scanned for the first time.
      <br />Updates will be shown on your next visit.
    </div>
    <div v-else class="course-details">No new updates</div>
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
} from "moodle-buddy-types"

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
  watch: {
    showDetails(value) {
      const arrow = this.$refs.arrow as HTMLDivElement
      if (value) {
        arrow.style.marginTop = "-2px"
        arrow.style.transform = "rotate(135deg)"
      } else {
        arrow.style.marginTop = "0px"
        arrow.style.transform = "rotate(45deg)"
      }
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

<style scoped>
.course-card {
  border: 1px rgb(230, 230, 230) solid;
  border-radius: 5px;
  padding: 10px 15px;
  margin: 7px 0px;
  display: flex;
  flex-direction: column;
}

.course-name {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.course-link {
  margin-left: 5px;
}

.action:hover {
  color: #c50e20;
  cursor: pointer;
  text-decoration: underline;
}

.action {
  white-space: nowrap;
  font-size: 14px;
  align-self: flex-end;
  color: rgb(66, 66, 66);
}

.update-name::after {
  content: "*";
  margin-left: 2px;
  vertical-align: super;
  color: #c50e20;
}

.course-details {
  font-size: 12px;
  color: rgb(57, 57, 57);
  margin-top: 5px;
}

.update-details {
  font-weight: bold;
}

.detail-container {
  margin-top: 5px;
  padding-left: 15px;
}

.filename {
  word-break: break-all;
}

.download-row {
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  justify-content: space-between;
}

.download-button {
  /* width: 170px; */
  padding: 10px 10px;
  margin-top: 10px;
  border-radius: 5px;
  border: 0;
  background-color: #c50e20;
  color: white;
  font-size: 11px;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.7px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.download-button:hover {
  cursor: pointer;
  text-decoration: underline;
}

.download-button:disabled {
  background-color: #a8a8a8;
  cursor: default;
  text-decoration: none;
}

.detail-switch {
  display: flex;
  align-items: center;
  margin-left: 5px;
  margin-top: 3px;
}

.switch-text:hover {
  color: #c50e20;
  cursor: pointer;
  text-decoration: underline;
}

.arrow {
  transition: all 0.5s;
  margin-right: 6px;
  margin-left: -5px;
  width: 4px;
  height: 4px;
  border-top: 2px solid black;
  border-right: 2px solid black;
  transform: rotate(45deg);
}
</style>
