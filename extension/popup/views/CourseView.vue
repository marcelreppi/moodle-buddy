<template>
  <div class="content-container">
    <div v-if="loading">Scanning course...</div>
    <div v-else class="content-container">
      <div v-if="showNewActivityInfo" id="new-activities">
        <span>The following activities were added to the course:</span>
        <div class="bold" v-for="(node, i) in newActivities" :key="i">
          {{ node.activityName }}
        </div>
        <hr />
      </div>
      <div class="resource-info">
        <span>
          There
          <span>{{ nResources === 1 ? "is" : "are" }}</span>
          <span class="bold">{{ nResources }}</span>
          <span class="bold">{{ nResources === 1 ? "resource" : "resources" }}</span>
          available for download
        </span>
        <div v-if="showNewResourceInfo" class="new-resources-info">
          <div>
            Since last visit
            <span class="bold">{{ nNewResources }} new</span>
            <span class="bold">{{ nNewResources === 1 ? "resource" : "resources" }}</span>
            <span>{{ nNewResources === 1 ? "was" : "were" }}</span>
            added
          </div>
          <div>
            <label>
              <input v-model="onlyNewResources" type="checkbox" />
              <span class="checkbox-label">Download only new resources</span>
            </label>
          </div>
          <div class="action" @click="onMarkAsSeenClick">Mark as seen</div>
        </div>
        <div class="marginize">
          <div>
            <label id="files-cb-label">
              <input v-model="downloadFiles" type="checkbox" :disabled="disableFilesCb" />
              <span class="checkbox-label">
                <span v-if="onlyNewResources">{{ nNewFiles }}</span>
                <span v-else>{{ nFiles }}</span>
                file(s) (PDF, etc.)
              </span>
            </label>
          </div>
          <div>
            <label id="folders-cb-label">
              <input v-model="downloadFolders" type="checkbox" :disabled="disableFoldersCb" />
              <span class="checkbox-label">
                <span v-if="onlyNewResources">{{ nNewFolders }}</span>
                <span v-else>{{ nFolders }}</span>
                folder(s)
              </span>
            </label>
          </div>
        </div>
        <button class="action marginize" :disabled="disableDownload" @click="toggleDetails">
          Show details on selected resources
        </button>

        <DetailOverlay
          v-if="showDetails"
          :resources="selectedResources"
          :toggle-details="toggleDetails"
        />

        <div v-if="showDownloadOptions" class="marginize">
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
      </div>

      <button class="download-button" :disabled="disableDownload" @click="onDownload">
        Download
      </button>
    </div>
  </div>
</template>

<script>
import { sendEvent } from "../../shared/helpers"

import DetailOverlay from "../components/DetailOverlay.vue"

export default {
  components: {
    DetailOverlay,
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
      resourceNodes: null,
      activityNodes: null,
      onlyNewResources: false,
      useMoodleFileName: false,
      prependCourseToFileName: false,
      prependCourseShortcutToFileName: false,
      saveToFolder: true,
      downloadFiles: true,
      downloadFolders: true,
      disableDownload: false,
      showDetails: false,
      showDownloadOptions: true,
    }
  },
  computed: {
    showNewResourceInfo() {
      return this.nNewFiles > 0 || this.nNewFolders > 0
    },
    showNewActivityInfo() {
      return this.nNewActivities > 0
    },
    nResources() {
      return this.nFiles + this.nFolders
    },
    nNewResources() {
      return this.nNewFiles + this.nNewFolders
    },
    newActivities() {
      return this.activityNodes.filter(n => n.isNewActivity)
    },
    disableFilesCb() {
      if (this.onlyNewResources) {
        return this.nNewFiles === 0
      }
      return this.nFiles === 0
    },
    disableFoldersCb() {
      if (this.onlyNewResources) {
        return this.nNewFolders === 0
      }
      return this.nFolders === 0
    },
    selectedResources() {
      return this.resourceNodes.filter(n => {
        let select = false

        if (n.isFile && this.downloadFiles) {
          select = true
        }

        if (n.isFolder && this.downloadFolders) {
          select = true
        }

        if (this.onlyNewResources && !n.isNewResource) {
          select = false
        }

        return select
      })
    },
  },
  watch: {
    nResources() {
      this.handleCheckboxes()

      this.disableDownload = this.nResources === 0
    },
    onlyNewResources() {
      this.handleCheckboxes()
    },
    downloadFiles() {
      this.disableDownload = !this.downloadFiles && !this.downloadFolders
    },
    downloadFolders() {
      this.disableDownload = !this.downloadFiles && !this.downloadFolders
    },
  },
  methods: {
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
      if (this.onlyNewResources) {
        sendEvent("download-course-page-only-new")
      } else {
        sendEvent("download-course-page")
      }

      this.disableDownload = true

      browser.tabs.sendMessage(this.activeTab.id, {
        command: "crawl",
        options: {
          skipFiles: !this.downloadFiles,
          skipFolders: !this.downloadFolders,
          onlyNewResources: this.onlyNewResources,
          saveToFolder: this.saveToFolder,
          useMoodleFileName: this.useMoodleFileName,
          prependCourseToFileName: this.prependCourseToFileName,
          prependCourseShortcutToFileName: this.prependCourseShortcutToFileName,
        },
      })
    },
    onMarkAsSeenClick() {
      sendEvent("mark-as-seen-course-page")
      this.onlyNewResources = false
      this.nNewFiles = 0
      this.nNewFolders = 0
      this.nNewActivities = 0
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "mark-as-seen",
      })
    },
    toggleDetails() {
      this.showDetails = !this.showDetails
    },
    showOptionsPage() {
      browser.runtime.openOptionsPage()
    },
  },
  created() {
    browser.runtime.onMessage.addListener(message => {
      if (message.command === "scan-result") {
        this.nFiles = message.nFiles
        this.nNewFiles = message.nNewFiles
        this.nFolders = message.nFolders
        this.nNewFolders = message.nNewFolders
        this.resourceNodes = message.resourceNodes

        this.nActivities = message.nActivities
        this.nNewActivities = message.nNewActivities
        this.activityNodes = message.activityNodes

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
    })

    this.showDownloadOptions = this.options.showDownloadOptions
    this.saveToFolder = this.options.saveToFolder
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
#new-activities {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0px 10px;
}

#new-activities > hr {
  margin: 10px 0px;
  color: rgba(240, 240, 240, 0.347);
  width: 110%;
}

.download-button {
  width: 100px;
  padding: 10px 0px;
  margin-top: 15px;
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
}

.bold {
  font-weight: 600;
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

.download-info {
  width: 300px;
  text-align: center;
  margin-bottom: 20px;
}

.checkbox-label {
  margin-left: 5px;
}

.marginize {
  margin-top: 10px;
}
</style>
