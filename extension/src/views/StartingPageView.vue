<template>
  <div class="content-container">
    <div class="no-courses" v-if="courses === null">Scanning courses for updates...</div>
    <div class="no-courses" v-else-if="courses.length === 0">No courses in overview</div>
    <div class="course-container" v-else>
      <div class="course-card" v-for="(course, index) in courses" :key="index">
        <div class="course-name">
          <div :class="{ 'update-name': hasUpdates(course) }">{{ course.name }}</div>
          <!-- <a @click="() => onCourseLinkClick(course.link)" :href="course.link">Go to course</a> -->
        </div>

        <div class="course-details update-details" v-if="hasUpdates(course)">
          {{ course.nNewDocuments + course.nNewFolders }} new resources
        </div>
        <div class="course-details" v-else>No new updates</div>

        <button
          class="download-button"
          v-if="hasUpdates(course)"
          @click="e => onDownloadClick(e, course)"
        >
          Download new resources
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    activeTab: Object,
  },
  data: function() {
    return {
      courses: null,
    }
  },
  methods: {
    hasUpdates: function(course) {
      return course.nNewDocuments > 0 || course.nNewFolders > 0
    },
    onCourseLinkClick: function(link) {
      browser.tabs.update(this.activeTab.id, {
        active: true,
        url: link,
      })
    },
    onDownloadClick: function(e, course) {
      e.target.disabled = true
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "crawl",
        link: course.link,
      })
    },
  },
  created: function() {
    browser.runtime.onMessage.addListener(message => {
      if (message.command === "scan-in-progress") {
        setTimeout(() => {
          browser.tabs.sendMessage(this.activeTab.id, {
            command: "scan",
          })
        }, 200)
        return
      }

      if (message.command === "scan-result") {
        this.courses = message.courses
        this.courses.sort((a, b) => {
          if (a.nNewDocuments > b.nNewDocuments || a.nNewFolders > b.nNewFolders) {
            return -1
          } else if (a.nNewDocuments < b.nNewDocuments || a.nNewFolders < b.nNewFolders) {
            return 1
          } else {
            return 0
          }
        })
      }
    })

    browser.tabs.sendMessage(this.activeTab.id, {
      command: "scan",
    })
  },
}
</script>

<style scoped>
.course-container {
  box-sizing: border-box;
  width: 100%;
  max-height: 300px;
  padding: 0px 20px;
  overflow-y: auto;
  /* margin-left: 20px; */
}

.no-courses {
  text-align: center;
}

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
  align-items: flex-end;
  justify-content: space-between;
}

.update-name::after {
  content: "*";
  margin-left: 2px;
  vertical-align: super;
  color: #c50e20;
}

.course-details {
  font-size: 12px;
  color: rgb(90, 90, 90);
  margin-top: 5px;
}

.update-details {
  font-weight: bold;
}

.download-button {
  width: 200px;
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
</style>
