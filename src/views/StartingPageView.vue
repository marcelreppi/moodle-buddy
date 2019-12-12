<template>
  <div class="content-container">
    <div class="course-list">
      <div class="no-courses" v-if="courses.length === 0">No courses in overview</div>
      <div class="course-card" v-else v-for="(item, index) in courses" :key="index">
        <div>{{item}}</div>
        <div class="course-update">No new updates</div>
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
      courses: [],
    }
  },
  created: function() {
    browser.tabs.sendMessage(this.activeTab.id, {
      command: "scan",
    })

    browser.runtime.onMessage.addListener(message => {
      if (message.command === "scan-result") {
        this.courses = message.courses
      }
    })
  },
}
</script>

<style>
.course-list {
  width: 100%;
  box-sizing: border-box;
  padding: 0px 10px;
}

.no-courses {
  text-align: center;
}

.course-card {
  border: 1px rgb(230, 230, 230) solid;
  border-radius: 5px;
  padding: 10px 15px;
  margin: 7px 0px;
}

.course-update {
  font-size: 12px;
  color: rgb(90, 90, 90);
  margin-top: 5px;
}
</style>