<template>
  <div class="content-container">
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
          <span v-else>were</span> added
        </div>
        <div>
          <label>
            <input type="checkbox" ref="newResourceCb" @input="onNewResourceCbClick" />
            <span class="checkbox-label">Download only new resources</span>
          </label>
        </div>
      </div>
      <div class="resource-selection">
        <div>
          <label id="files-cb-label">
            <input type="checkbox" ref="filesCb" @input="onFilesCbClick" checked />
            <span class="checkbox-label">
              <span v-if="onlyNewResources">{{ nNewFiles }}</span>
              <span v-else>{{ nFiles }}</span>
              file(s) (PDF, etc.)
            </span>
          </label>
        </div>
        <div>
          <label id="folders-cb-label">
            <input type="checkbox" ref="foldersCb" @input="onFolderCbClick" checked />
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
          <input type="checkbox" ref="useMoodleFilenameCb" />
          <span class="checkbox-label">Use Moodle file name as actual file name</span>
        </label>
      </div>
      <div>
        <label>
          <input type="checkbox" ref="prependCourseShortcutToFilenameCb" />
          <span class="checkbox-label">Prepend course shortcut to each file name</span>
        </label>
      </div>
      <div>
        <label>
          <input type="checkbox" ref="prependCourseToFilenameCb" />
          <span class="checkbox-label">Prepend course name to each file name</span>
        </label>
      </div>
    </div>
    <button class="download-button" @click="onDownload" ref="downloadButton">Download</button>
  </div>
</template>

<script>
import { sendEvent, getActiveTab } from "../../shared/helpers.js"

export default {
  props: {
    activeTab: Object,
  },
  data: function() {
    return {
      loading: true,
      nFiles: 0,
      nNewFiles: 0,
      nFolders: 0,
      nNewFolders: 0,
      firstDownload: true,
      onlyNewResources: false,
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
  },
  methods: {
    onDownload: function() {
      sendEvent("download")
      this.$refs.downloadButton.disabled = true
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "crawl",
        useMoodleFilename: this.$refs.useMoodleFilenameCb.checked,
        prependCourseToFilename: this.$refs.prependCourseToFilenameCb.checked,
        prependCourseShortcutToFilename: this.$refs.prependCourseShortcutToFilenameCb.checked,
        skipFiles: !this.$refs.filesCb.checked,
        skipFolders: !this.$refs.foldersCb.checked,
        onlyNewResources: this.onlyNewResources,
      })
    },
    onFilesCbClick: function(e) {
      if (!e.target.checked && !this.$refs.foldersCb.checked) {
        this.$refs.downloadButton.disabled = true
      } else {
        this.$refs.downloadButton.disabled = false
      }
    },
    onFolderCbClick: function(e) {
      if (!e.target.checked && !this.$refs.filesCb.checked) {
        this.$refs.downloadButton.disabled = true
      } else {
        this.$refs.downloadButton.disabled = false
      }
    },
    onNewResourceCbClick: function(e) {
      this.onlyNewResources = this.$refs.newResourceCb.checked

      if (this.onlyNewResources) {
        if (this.nNewFiles === 0) {
          this.$refs.filesCb.disabled = true
          this.$refs.filesCb.checked = false
        } else {
          this.$refs.filesCb.disabled = false
          this.$refs.filesCb.checked = true
        }

        if (this.nNewFolders === 0) {
          this.$refs.foldersCb.disabled = true
          this.$refs.foldersCb.checked = false
        } else {
          this.$refs.foldersCb.disabled = false
          this.$refs.foldersCb.checked = true
        }
      } else {
        if (this.nFiles === 0) {
          this.$refs.filesCb.disabled = true
          this.$refs.filesCb.checked = false
        } else {
          this.$refs.filesCb.disabled = false
          this.$refs.filesCb.checked = true
        }

        if (this.nFolders === 0) {
          this.$refs.foldersCb.disabled = true
          this.$refs.foldersCb.checked = false
        } else {
          this.$refs.foldersCb.disabled = false
          this.$refs.foldersCb.checked = true
        }
      }

      this.$refs.downloadButton.disabled = false
    },
  },
  mounted: function() {
    browser.runtime.onMessage.addListener(message => {
      if (message.command === "scan-result") {
        this.nFiles = message.nFiles
        this.nNewFiles = message.nNewFiles
        this.nFolders = message.nFolders
        this.nNewFolders = message.nNewFolders

        if (this.nResources === 0) {
          this.$refs.downloadButton.disabled = true
        }

        if (this.nFiles === 0) {
          this.$refs.filesCb.disabled = true
          this.$refs.filesCb.checked = false
        }

        if (this.nFolders === 0) {
          this.$refs.foldersCb.disabled = true
          this.$refs.foldersCb.checked = false
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
