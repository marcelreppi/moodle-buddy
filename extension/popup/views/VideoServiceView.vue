<template>
  <div class="content-container">
    <div v-if="loading">Scanning course...</div>
    <div v-else class="content-container">
      <div class="resource-info">
        <span>
          There
          <span>{{ nVideos === 1 ? "is" : "are" }}</span>
          <span class="bold">{{ nVideos }}</span>
          <span class="bold">{{ nVideos === 1 ? "video" : "videos" }}</span>
          available for download
        </span>
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
              <input v-model="downloadVideos" type="checkbox" :disabled="disableVideoCb" />
              <span class="checkbox-label">
                <span>{{ nVideos }}</span>
                video(s)
              </span>
            </label>
          </div>
        </div>

        <button
          class="action"
          style="margin-top: 10px"
          :disabled="disableDownload"
          @click="toggleDetails"
        >
          Show details on selected resources
        </button>
      </div>

      <detailed-selection
        v-else
        :resources="videoResources"
        :setResourceSelected="setResourceSelected"
      />
    </div>

    <detail-overlay
      v-if="showDetails"
      :resources="selectedResources"
      :toggle-details="toggleDetails"
    />

    <div v-if="showDownloadOptions" style="margin-top: 20px;">
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

    <div v-if="downloadInProgress" class="download-hint">
      <div>
        Please don't click anything on the page and wait until the download for every video has been
        started.
      </div>
      <div>
        Downloading many videos concurrently can be very slow.
      </div>
    </div>

    <progress-bar
      v-if="downloadInProgress"
      ref="progressBar"
      :total="selectedResources.length"
      type="download"
      :onDone="onDownloadFinished"
      :onCancel="onCancel"
      style="width: 80%;"
    ></progress-bar>

    <button class="download-button" :disabled="disableDownload" @click="onDownload">
      Download
    </button>
  </div>
</template>

<script>
import { sendEvent } from "../../shared/helpers"

import DetailOverlay from "../components/DetailOverlay.vue"
import DetailedSelection from "../components/DetailedSelection.vue"
import ProgressBar from "../components/ProgressBar.vue"

export default {
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
      nVideos: -1,
      videoResources: null,
      useMoodleFileName: false,
      prependCourseToFileName: false,
      prependCourseShortcutToFileName: false,
      downloadVideos: true,
      showDetails: false,
      showDownloadOptions: true,
      activeSelectionTab: "simple",
      downloadInProgress: false,
      downloadProgressText: "",
    }
  },
  computed: {
    showSimpleSelection() {
      return this.activeSelectionTab === "simple"
    },
    selectedResources() {
      return this.videoResources.filter(n => {
        if (this.activeSelectionTab === "simple") {
          return true
        }

        if (this.activeSelectionTab === "detailed") {
          return n.selected
        }

        return false
      })
    },
    disableVideoCb() {
      return this.nVideos === 0
    },
    disableDownload() {
      if (this.downloadInProgress) {
        return true
      }

      if (this.nVideos === 0) {
        return true
      }

      if (this.activeSelectionTab === "detailed") {
        return this.videoResources.every(r => !r.selected)
      }

      return false
    },
  },
  methods: {
    setSelectionTab(tab) {
      this.activeSelectionTab = tab
    },
    onDownload() {
      const eventParts = ["download-videoservice-page", this.activeSelectionTab]
      sendEvent(eventParts.join("-"), true, { numberOfFiles: this.selectedResources.length })

      this.downloadInProgress = true

      browser.tabs.sendMessage(this.activeTab.id, {
        command: "crawl",
        selectedResources: this.selectedResources,
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
    toggleDetails() {
      this.showDetails = !this.showDetails

      if (this.showDetails) {
        sendEvent("show-details-course-page", true)
      }
    },
    setResourceSelected(href, value) {
      const resource = this.videoResources.find(r => r.href === href)
      resource.selected = value
    },
    onCancel() {
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "cancel-download",
      })
      this.downloadInProgress = false
      sendEvent("cancel-download", true)
    },
  },
  created() {
    browser.runtime.onMessage.addListener(message => {
      if (message.command === "scan-result") {
        this.nVideos = message.videoResources.length
        this.videoResources = message.videoResources.map(r => {
          return { ...r, selected: false, isFile: true }
        })

        this.loading = false
      }

      if (message.command === "download-start-progress") {
        const { completed, total, errors } = message
        if (this.$refs.progressBar) {
          this.$refs.progressBar.setProgress(completed, total, errors)
        }
      }
    })

    this.showDownloadOptions = this.options.showDownloadOptions
    this.useMoodleFileName = this.options.useMoodleFileName
    this.prependCourseToFileName = this.options.prependCourseToFileName
    this.prependCourseShortcutToFileName = this.options.prependCourseShortcutToFileName

    // Scan for resources
    browser.tabs.sendMessage(this.activeTab.id, {
      command: "scan",
    })
  },
}
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

.download-hint {
  padding: 0px 40px;
  margin-top: 20px;
  font-weight: 700;
  text-align: center;
}
</style>
