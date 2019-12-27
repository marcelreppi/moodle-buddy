<template>
  <div class="content-container">
    <div v-if="courses === null" class="no-courses">Scanning courses for updates...</div>
    <div v-else-if="courses.length === 0" class="no-courses">No courses in overview</div>
    <div v-else class="course-container">
      <course
        v-for="(course, i) in courses"
        :key="i"
        :course="course"
        :active-tab="activeTab"
        :options="options"
      />
    </div>
  </div>
</template>

<script>
import Course from "../components/Course.vue"

export default {
  components: {
    course: Course,
  },
  props: {
    activeTab: Object,
    options: Object,
  },
  data: function() {
    return {
      courses: null,
    }
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
          if (a.nNewFiles > b.nNewFiles || a.nNewFolders > b.nNewFolders) {
            return -1
          } else if (a.nNewFiles < b.nNewFiles || a.nNewFolders < b.nNewFolders) {
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

<style>
.course-container {
  box-sizing: border-box;
  width: 100%;
  max-height: 300px;
  padding: 0px 10px;
  overflow-y: auto;
}

.no-courses {
  text-align: center;
}
</style>
