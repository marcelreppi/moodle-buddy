<template>
  <div class="content-container">
    <div v-if="loading">Scanning course...</div>
    <div v-else class="content-container">
      <div class="resource-info">
        <div>
          There
          <span v-if="nResources === 1">is</span>
          <span v-else>are</span>
          <span class="bold">{{ nResources }}</span>
          <span v-if="nResources === 1">resource</span>
          <span v-else>resources</span>
          available for download
        </div>
        <div v-if="showNewResourceInfo" class="new-resources-info">
          <div>
            Since last visit
            <span class="bold">{{ nNewResources }} new</span>
            <span v-if="nNewResources === 1">resource</span>
            <span v-else>resources</span>
            <span v-if="nNewResources === 1">was</span>
            <span v-else>were</span>
            added
          </div>
          <div>
            <label>
              <input type="checkbox" v-model="onlyNewResources" />
              <span class="checkbox-label">Download only new resources</span>
            </label>
          </div>
          <div class="mark-as-seen" @click="onMarkAsSeenClick">Mark as seen</div>
        </div>
        <div class="resource-selection">
          <div>
            <label id="files-cb-label">
              <input type="checkbox" v-model="downloadFiles" :disabled="disableFilesCb" />
              <span class="checkbox-label">
                <span v-if="onlyNewResources">{{ nNewFiles }}</span>
                <span v-else>{{ nFiles }}</span>
                file(s) (PDF, etc.)
              </span>
            </label>
          </div>
          <div>
            <label id="folders-cb-label">
              <input type="checkbox" v-model="downloadFolders" :disabled="disableFoldersCb" />
              <span class="checkbox-label">
                <span v-if="onlyNewResources">{{ nNewFolders }}</span>
                <span v-else>{{ nFolders }}</span>
                folder(s)
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <div>
          <label>
            <input type="checkbox" ref="useMoodleFilenameCb" v-model="useMoodleFilename" />
            <span class="checkbox-label">Use Moodle file name as actual file name</span>
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" v-model="prependCourseShortcutToFilename" />
            <span class="checkbox-label">Prepend course shortcut to each file name</span>
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" v-model="prependCourseToFilename" />
            <span class="checkbox-label">Prepend course name to each file name</span>
          </label>
        </div>
      </div>
      <button class="download-button" @click="onDownload" :disabled="disableDownload">
        Download
      </button>
    </div>
  </div>
</template>

<script>
import { sendEvent, getActiveTab } from "../../shared/helpers.js"

export default {
  props: {
    activeTab: Object,
    options: Object,
  },
  data: function() {
    return {
      loading: true,
      nFiles: -1,
      nNewFiles: -1,
      nFolders: -1,
      nNewFolders: -1,
      onlyNewResources: false,
      useMoodleFilename: false,
      prependCourseToFilename: false,
      prependCourseShortcutToFilename: false,
      downloadFiles: true,
      downloadFolders: true,
      disableDownload: false,
    }
  },
  computed: {
    showNewResourceInfo: function() {
      return this.nNewFiles > 0 || this.nNewFolders > 0
    },
    nResources: function() {
      return this.nFiles + this.nFolders
    },
    nNewResources: function() {
      return this.nNewFiles + this.nNewFolders
    },
    disableFilesCb: function() {
      if (this.onlyNewResources) {
        return this.nNewFiles === 0
      } else {
        return this.nFiles === 0
      }
    },
    disableFoldersCb: function() {
      if (this.onlyNewResources) {
        return this.nNewFolders === 0
      } else {
        return this.nFolders === 0
      }
    },
  },
  watch: {
    nResources: function() {
      this.handleCheckboxes()

      this.disableDownload = this.nResources === 0
    },
    onlyNewResources: function() {
      this.handleCheckboxes()
    },
    downloadFiles: function() {
      this.disableDownload = !this.downloadFiles && !this.downloadFolders
    },
    downloadFolders: function() {
      this.disableDownload = !this.downloadFiles && !this.downloadFolders
    },
  },
  methods: {
    handleCheckboxes: function() {
      if (this.onlyNewResources) {
        this.downloadFiles = this.nNewFiles !== 0
        this.downloadFolders = this.nNewFolders !== 0
      } else {
        this.downloadFiles = this.nFiles !== 0
        this.downloadFolders = this.nFolders !== 0
      }
    },
    onDownload: function() {
      if (this.onlyNewResources) {
        sendEvent("download-course-page-only-new")
      } else {
        sendEvent("download-course-page")
      }

      this.disableDownload = true

      browser.tabs.sendMessage(this.activeTab.id, {
        command: "crawl",
        useMoodleFilename: this.useMoodleFilename,
        prependCourseToFilename: this.prependCourseToFilename,
        prependCourseShortcutToFilename: this.prependCourseShortcutToFilename,
        skipFiles: !this.downloadFiles,
        skipFolders: !this.downloadFolders,
        onlyNewResources: this.onlyNewResources,
      })
    },
    onMarkAsSeenClick: function() {
      sendEvent("mark-as-seen-course-page")
      this.onlyNewResources = false
      this.nNewFiles = 0
      this.nNewFolders = 0
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "mark-as-seen",
      })
    },
  },
  mounted: function() {
    browser.runtime.onMessage.addListener(message => {
      if (message.command === "scan-result") {
        this.nFiles = message.nFiles
        this.nNewFiles = message.nNewFiles
        this.nFolders = message.nFolders
        this.nNewFolders = message.nNewFolders

        if (this.options) {
          this.onlyNewResources = this.options.onlyNewResources
          this.useMoodleFilename = this.options.useMoodleFilename
          this.prependCourseToFilename = this.options.prependCourseToFilename
          this.prependCourseShortcutToFilename = this.options.prependCourseShortcutToFilename
        }

        this.loading = false
      }
    })

    // Scan for resources
    browser.tabs.sendMessage(this.activeTab.id, {
      command: "scan",
    })
  },
}
</script>

<style scoped>
.download-button {
  width: 100px;
  padding: 10px 0px;
  margin-top: 10px;
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
  margin-bottom: 20px;
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

.mark-as-seen {
  font-size: 14px;
  text-decoration: underline;
  color: rgb(66, 66, 66);
}

.mark-as-seen:hover {
  cursor: pointer;
}

.resource-selection {
  margin-top: 10px;
}

.download-info {
  width: 300px;
  text-align: center;
  margin-bottom: 20px;
}

.checkbox-label {
  margin-left: 5px;
}
</style>
