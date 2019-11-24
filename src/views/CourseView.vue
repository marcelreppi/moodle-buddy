<template>
  <div class="content-container">
    <div class="resource-info">
      <div>
        There
        <span v-if="numberOfResources === 1">is</span>
        <span v-else>are</span>
        <span class="resource-info-number">{{numberOfResources}}</span>
        <span v-if="numberOfResources === 1">resource</span>
        <span v-else>resources</span>
        available for download.
      </div>
      <div class="resource-selection">
        <div>
          <label id="documents-cb-label">
            <input type="checkbox" ref="documentsCb" @input="onDocumentCbClick" checked />
            <span class="checkbox-label">{{nDocuments}} document(s) (PDF, etc.)</span>
          </label>
        </div>
        <div>
          <label id="folders-cb-label">
            <input type="checkbox" ref="foldersCb" @input="onFolderCbClick" checked />
            <span class="checkbox-label">{{nFolders}} folder(s)</span>
          </label>
        </div>
      </div>
    </div>

    <div
      class="download-info"
    >Click the button below to download all available resources from this Moodle course.</div>

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
import { getActiveTab } from "../helpers.js"
import { sendEvent } from "../../shared/sendEvent.js"

export default {
  props: {
    activeTab: Object,
  },
  data: function() {
    return {
      loading: true,
      numberOfResources: 0,
      nDocuments: 0,
      nFolders: 0,
    }
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
        skipDocuments: !this.$refs.documentsCb.checked,
        skipFolders: !this.$refs.foldersCb.checked,
      })
    },
    onDocumentCbClick: function(e) {
      if (!e.target.checked && !this.$refs.foldersCb.checked) {
        this.$refs.downloadButton.disabled = true
      } else {
        this.$refs.downloadButton.disabled = false
      }
    },
    onFolderCbClick: function(e) {
      if (!e.target.checked && !this.$refs.documentsCb.checked) {
        this.$refs.downloadButton.disabled = true
      } else {
        this.$refs.downloadButton.disabled = false
      }
    },
  },
  created: function() {
    // Scan for documents
    browser.tabs.sendMessage(this.activeTab.id, {
      command: "scan",
    })

    browser.runtime.onMessage.addListener(message => {
      if (message.command === "scan-result") {
        this.numberOfResources = message.numberOfResources
        this.nDocuments = message.nDocuments
        this.nFolders = message.nFolders

        if (message.numberOfResources === 0) {
          this.$refs.downloadButton.disabled = true
        }

        if (message.nDocuments === 0) {
          this.$refs.documentsCb.disabled = true
          this.$refs.documentsCb.checked = false
        }

        if (message.nFolders === 0) {
          this.$refs.foldersCb.disabled = true
          this.$refs.foldersCb.checked = false
        }

        this.loading = false
      }
    })
  },
}
</script>

<style>
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

.resource-info-number {
  font-weight: 600;
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