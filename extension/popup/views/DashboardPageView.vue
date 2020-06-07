<template>
  <div class="content-container">
    <div v-if="courses === null" class="no-courses">
      <div>Scanning courses for updates...</div>
      <progress-bar type="scan" ref="progressBar"></progress-bar>
    </div>
    <div v-else-if="courses.length === 0" class="no-courses">
      <div>No courses found</div>
    </div>
    <div v-else class="course-container scrollbar">
      <CourseCard
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
import CourseCard from "../components/CourseCard.vue"
import ProgressBar from "../components/ProgressBar.vue"

export default {
  components: {
    CourseCard,
    ProgressBar,
  },
  props: {
    activeTab: Object,
    options: Object,
  },
  data() {
    return {
      courses: null,
    }
  },
  created() {
    browser.runtime.onMessage.addListener(message => {
      if (message.command === "scan-in-progress") {
        if (message.total !== 0) {
          this.$refs.progressBar.setProgress(message.total, message.completed)
        } else {
          this.$refs.progressBar.resetProgress()
        }
        return
      }

      if (message.command === "scan-result") {
        this.courses = message.courses

        this.courses.sort((a, b) => {
          if (
            a.nNewFiles > b.nNewFiles ||
            a.nNewFolders > b.nNewFolders ||
            a.nNewActivities > b.nNewActivities
          ) {
            return -1
          }

          if (
            a.nNewFiles < b.nNewFiles ||
            a.nNewFolders < b.nNewFolders ||
            a.nNewActivities < b.nNewActivities
          ) {
            return 1
          }

          return 0
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
