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
        <div class="update-details">
          <span>{{ course.nNewFiles + course.nNewFolders }}</span>
          <span v-if="course.nNewFiles + course.nNewFolders === 1">new resource</span>
          <span v-else>new resources</span>
        </div>
        <div class="detail-switch" @click="onDetailClick">
          <div ref="arrow" class="arrow" />
          <div class="switch-text">{{ switchWord }} details</div>
        </div>
        <div v-if="showDetails" class="detail-container">
          <div v-for="(resource, i) in newResources" :key="i">
            <span class="filename">- {{ resource.mb_filename }}</span>
            <span v-if="resource.mb_isFile || resource.mb_isPluginfile">(File)</span>
            <span v-if="resource.mb_isFolder">(Folder)</span>
          </div>
        </div>
      </div>

      <div class="download-row">
        <button v-if="hasUpdates" class="download-button" @click="e => onDownloadClick(e, course)">
          Download new resources
        </button>
        <div class="action" @click="() => onMarkAsSeenClick(course)">Mark as seen</div>
      </div>
    </div>
    <div v-else-if="course.isNew" class="course-details">
      Scanned for the first time.
      <br />
      Updates will be shown on your next visit.
    </div>
    <div v-else class="course-details">No new updates</div>
  </div>
</template>

<script>
import { sendEvent } from "../../shared/helpers"

export default {
  props: {
    course: Object,
    activeTab: Object,
    options: Object,
  },
  data: function() {
    return {
      showDetails: false,
      switchWord: "More",
    }
  },
  computed: {
    newResources: function() {
      return this.course.resourceNodes.filter(n => n.mb_isNewResource)
    },
    hasUpdates: function() {
      return this.course.nNewFiles > 0 || this.course.nNewFolders > 0
    },
  },
  watch: {
    showDetails: function(value) {
      if (value) {
        this.$refs.arrow.style.marginTop = "-2px"
        this.$refs.arrow.style.transform = "rotate(135deg)"
        this.switchWord = "Less"
      } else {
        this.$refs.arrow.style.marginTop = "0px"
        this.$refs.arrow.style.transform = "rotate(45deg)"
        this.switchWord = "More"
      }
    },
  },
  methods: {
    onCourseLinkClick: function(link) {
      browser.tabs.create({
        url: link,
      })
      window.close()
    },
    onDownloadClick: function(e, course) {
      sendEvent("download-start-page")
      e.target.disabled = true
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "crawl",
        link: course.link,
      })
    },
    onMarkAsSeenClick: function(course) {
      sendEvent("mark-as-seen-start-page")

      course.nNewFiles = 0
      course.nNewFolders = 0
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "mark-as-seen",
        link: course.link,
      })
    },
    onDetailClick: function() {
      this.showDetails = !this.showDetails
    },
  },
  mounted: function() {
    if (!this.options) return

    if (this.hasUpdates) {
      this.showDetails = this.options.alwaysShowDetails
    }
  },
}
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
