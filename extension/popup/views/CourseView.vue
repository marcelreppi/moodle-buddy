<template>
  <div class="content-container">
    <div v-if="loading">Scanning course...</div>
    <div v-else class="content-container">
      <div v-if="showNewActivityInfo" id="new-activities">
        <span>The following activities were added to the course:</span>
        <div class="bold" v-for="(node, i) in newActivities" :key="i">
          {{ node.name }}
        </div>
        <hr />
      </div>
      <div class="resource-info">
        <span>
          There
          <span>{{ nResources === 1 ? "is" : "are" }}</span>
          {{ " " }}
          <span class="bold">{{ nResources }}</span>
          {{ " " }}
          <span class="bold">{{ nResources === 1 ? "resource" : "resources" }}</span>
          available for download
        </span>
        <div v-if="showNewResourceInfo" class="new-resources-info">
          <div>
            Since last visit
            <span class="bold">{{ nNewResources }} new</span>
            {{ " " }}
            <span class="bold">{{ nNewResources === 1 ? "resource" : "resources" }}</span>
            {{ " " }}
            <span>{{ nNewResources === 1 ? "was" : "were" }}</span>
            {{ " " }}
            added
          </div>
          <div>
            <label>
              <input v-model="onlyNewResources" type="checkbox" />
              <span class="checkbox-label">Download only new resources</span>
            </label>
          </div>
          <div class="new-resource-actions">
            <div class="action" @click="toggleDetails(true)">Show details</div>
            <div class="action" @click="onMarkAsSeenClick">Mark as seen</div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div
          class="tab"
          :class="{ 'active-tab': showSimpleSelection }"
          @click="() => setSelectionTab('simple')"
        >
          Simple
        </div>
        <div
          class="tab"
          :class="{ 'active-tab': !showSimpleSelection }"
          @click="() => setSelectionTab('detailed')"
        >
          Detailed
        </div>
      </div>

      <div v-if="showSimpleSelection" class="resource-info">
        <div>
          <div>
            <label>
              <input v-model="downloadFiles" type="checkbox" :disabled="disableFilesCb" />
              <span class="checkbox-label">
                <span v-if="onlyNewResources">{{ nNewFiles }}</span>
                <span v-else>{{ nFiles }}</span>
                file(s) (PDF, etc.)
              </span>
            </label>
          </div>
          <div>
            <label>
              <input v-model="downloadFolders" type="checkbox" :disabled="disableFoldersCb" />
              <span class="checkbox-label">
                <span v-if="onlyNewResources">{{ nNewFolders }}</span>
                <span v-else>{{ nFolders }}</span>
                folder(s)
              </span>
            </label>
          </div>
        </div>

        <button
          class="action"
          style="margin-top: 10px"
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
        :onlyNewResources="onlyNewResources"
      />

      <detail-overlay
        v-if="showDetails"
        :resources="showDetailResources"
        :toggle-details="toggleDetails"
      />

      <div v-if="showDownloadOptions" style="margin-top: 20px">
        <div>
          <label>
            <input v-model="prependCourseShortcutToFileName" type="checkbox" />
            <span class="checkbox-label">Prepend course shortcut to each file name</span>
          </label>
        </div>
        <div>
          <label>
            <input v-model="prependCourseToFileName" type="checkbox" />
            <span class="checkbox-label">Prepend course name to each file name</span>
          </label>
        </div>
      </div>

      <ProgressBar
        v-if="downloadInProgress"
        ref="progressBar"
        type="download"
        :onDone="onDownloadFinished"
        :onCancel="onCancel"
        style="width: 80%"
      ></ProgressBar>

      <button class="download-button" :disabled="disableDownload" @click="onDownload">
        Download
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { SelectionTab } from "../../types/extension.types"
import {
  CourseScanResultMessage,
  DownloadProgressMessage,
  Message,
  ScanMessage,
} from "../../types/messages.types"
import { Activity, Resource, FileResource, FolderResource } from "../../models/Course.types"
import { sendEvent } from "../../shared/helpers"

import DetailOverlay from "../components/DetailOverlay.vue"
import DetailedSelection from "../components/DetailedSelection.vue"
import ProgressBar from "../components/ProgressBar.vue"

export default defineComponent({
  components: {
    DetailOverlay,
    DetailedSelection,
    ProgressBar,
  },
  props: {
    activeTab: {
      type: Object,
      required: true,
    },
    options: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      loading: true,
      nFiles: -1,
      nNewFiles: -1,
      nFolders: -1,
      nNewFolders: -1,
      nActivities: -1,
      nNewActivities: -1,
      resources: [] as Resource[],
      activities: [] as Activity[],
      onlyNewResources: false,
      useMoodleFileName: false,
      prependCourseToFileName: false,
      prependCourseShortcutToFileName: false,
      downloadFiles: true,
      downloadFolders: true,
      showDetails: false,
      showDetailResources: [] as Array<Resource | Activity>,
      showDownloadOptions: true,
      activeSelectionTab: "simple" as SelectionTab,
      downloadInProgress: false,
      downloadProgressText: "",
    }
  },
  computed: {
    showSimpleSelection(): boolean {
      return this.activeSelectionTab === "simple"
    },
    showNewResourceInfo(): boolean {
      return this.nNewFiles > 0 || this.nNewFolders > 0
    },
    showNewActivityInfo(): boolean {
      return this.nNewActivities > 0
    },
    nResources(): number {
      return this.nFiles + this.nFolders
    },
    nNewResources(): number {
      return this.nNewFiles + this.nNewFolders
    },
    newActivities(): Activity[] {
      return this.activities.filter((n) => n.isNew)
    },
    disableFilesCb(): boolean {
      if (this.onlyNewResources) {
        return this.nNewFiles === 0
      }
      return this.nFiles === 0
    },
    disableFoldersCb(): boolean {
      if (this.onlyNewResources) {
        return this.nNewFolders === 0
      }
      return this.nFolders === 0
    },
    newResources(): Resource[] {
      return this.resources.filter((n) => n.isNew)
    },
    selectedResources(): Array<Resource | Activity> {
      return this.resources.filter((n) => {
        if (this.activeSelectionTab === "simple") {
          if (!this.downloadFiles && (n as FileResource).isFile) return false
          if (!this.downloadFolders && (n as FolderResource).isFolder) return false
          if (this.onlyNewResources && !n.isNew) return false

          return true
        }

        if (this.activeSelectionTab === "detailed") {
          return n.selected
        }

        return false
      })
    },
    disableDownload(): boolean {
      if (this.downloadInProgress) {
        return true
      }

      if (this.nResources === 0) {
        return true
      }

      if (this.activeSelectionTab === "simple") {
        return !this.downloadFiles && !this.downloadFolders
      }

      if (this.activeSelectionTab === "detailed") {
        return this.resources.every((r) => !r.selected)
      }

      return false
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progressBarRef(): any {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.$refs.progressBar as any
    },
  },
  watch: {
    nResources() {
      this.handleCheckboxes()
    },
    onlyNewResources() {
      this.handleCheckboxes()
    },
  },
  methods: {
    setSelectionTab(tab: SelectionTab) {
      this.activeSelectionTab = tab
    },
    handleCheckboxes() {
      if (this.onlyNewResources) {
        this.downloadFiles = this.nNewFiles !== 0
        this.downloadFolders = this.nNewFolders !== 0
      } else {
        this.downloadFiles = this.nFiles !== 0
        this.downloadFolders = this.nFolders !== 0
      }
    },
    onDownload() {
      const eventParts = ["download-course-page", this.activeSelectionTab]
      if (this.onlyNewResources) {
        eventParts.push("only-new")
      }
      sendEvent(eventParts.join("-"), true, { numberOfFiles: this.selectedResources.length })

      this.downloadInProgress = true

      browser.tabs.sendMessage(this.activeTab.id, {
        command: "crawl",
        selectedResources: this.selectedResources.map((r) => ({ ...r })), // Resolve proxy
        options: {
          useMoodleFileName: this.useMoodleFileName,
          prependCourseToFileName: this.prependCourseToFileName,
          prependCourseShortcutToFileName: this.prependCourseShortcutToFileName,
        },
      })
    },
    onDownloadFinished() {
      setTimeout(() => {
        this.downloadInProgress = false
      }, 3000)
    },
    onMarkAsSeenClick() {
      sendEvent("mark-as-seen-course-page", true)
      this.onlyNewResources = false
      this.nNewFiles = 0
      this.nNewFolders = 0
      this.nNewActivities = 0
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "mark-as-seen",
      })
    },
    toggleDetails(onlyNew = false) {
      if (onlyNew) {
        this.showDetailResources = this.newResources
      } else {
        this.showDetailResources = this.selectedResources
      }

      this.showDetails = !this.showDetails

      if (this.showDetails) {
        sendEvent("show-details-course-page", true)
      }
    },
    showOptionsPage() {
      browser.runtime.openOptionsPage()
    },
    setResourceSelected(href: string, value: boolean) {
      const resource = this.resources.find((r) => r.href === href)
      if (resource) {
        resource.selected = value
      }
    },
    onCancel() {
      browser.runtime.sendMessage({
        command: "cancel-download",
      })
      this.downloadInProgress = false
      sendEvent("cancel-download", true)
    },
  },
  updated() {
    if (this.downloadInProgress) {
      this.progressBarRef.setProgress(this.selectedResources.length)
    }
  },
  created() {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
      const { command } = message as Message
      if (command === "scan-result") {
        const { course } = message as CourseScanResultMessage
        const { resources, activities, counts } = course
        this.nFiles = counts.nFiles
        this.nNewFiles = counts.nNewFiles
        this.nFolders = counts.nFolders
        this.nNewFolders = counts.nNewFolders
        this.resources = resources.map((r) => ({ ...r, selected: false }))

        this.nActivities = counts.nActivities
        this.nNewActivities = counts.nNewActivities
        this.activities = activities

        if (this.nNewResources > 0) {
          this.onlyNewResources = this.options.onlyNewResources
        }

        this.loading = false

        if (this.nNewActivities > 0) {
          browser.tabs.sendMessage(this.activeTab.id, {
            command: "update-activities",
          })
        }
      }

      if (command === "download-progress") {
        const { completed, total, errors } = message as DownloadProgressMessage
        if (this.progressBarRef) {
          this.progressBarRef.setProgress(total, completed, errors)
        }
      }
    }
    browser.runtime.onMessage.addListener(messageListener)

    this.showDownloadOptions = this.options.showDownloadOptions
    this.useMoodleFileName = this.options.useMoodleFileName
    this.prependCourseToFileName = this.options.prependCourseToFileName
    this.prependCourseShortcutToFileName = this.options.prependCourseShortcutToFileName

    // Scan for resources
    browser.tabs.sendMessage<ScanMessage>(this.activeTab.id, {
      command: "scan",
    })
  },
})
</script>

<style scoped>
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 35px;
  width: 80%;
  margin: 5px 0px;
  font-size: 14px;
  color: #545454;
}

.tab {
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 3px solid #dcdcdc;
}

.tab:hover {
  cursor: pointer;
}

.active-tab {
  border-bottom: 3px solid #c50e20;
  color: black;
}

#new-activities {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0px 10px;
}

#new-activities > hr {
  width: 110%;
  margin-bottom: 0px;
}

.download-button {
  width: 100px;
  padding: 10px 0px;
  margin-top: 20px;
  border-radius: 5px;
  border: 0;
  background-color: #c50e20;
  color: white;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.5px;
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

.resource-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
  box-sizing: border-box;
}

.new-resources-info {
  margin-top: 10px;
  margin-bottom: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.action {
  font-size: 14px;
  text-decoration: underline;
  color: rgb(66, 66, 66);
}

.action:hover {
  cursor: pointer;
  color: #c50e20;
}

.action:disabled {
  color: rgb(202, 202, 202);
  cursor: default;
}

.checkbox-label {
  margin-left: 5px;
}

.new-resource-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 10px;
  margin-top: 2px;
}
</style>
