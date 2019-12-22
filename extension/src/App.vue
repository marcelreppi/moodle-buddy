<template>
  <div>
    <div class="title">
      Moodle Buddy
      <img class="title-icon" :src="MoodleIcon" alt="logo" />
    </div>

    <div id="popup-content">
      <StartingPageView v-if="showStartingPageView" :activeTab="activeTab"></StartingPageView>
      <CourseView v-if="showCourseView" :activeTab="activeTab"></CourseView>
      <NoMoodle v-if="showNoMoodle" :activeTab="activeTab"></NoMoodle>
    </div>

    <div class="footer">
      <span>
        Inofficial Plugin made by
        <a href="https://twitter.com/marcelreppi">marcelreppi</a>
      </span>
      <span class="footer-right-section">
        <a href="https://github.com/marcelreppi/moodle-buddy">GitHub</a>
        <img class="info-icon" :src="InfoIcon" alt="info" @click="onInfoClick" />
      </span>
    </div>
  </div>
</template>

<script>
import { sendEvent, getActiveTab } from "../shared/helpers.js"
import StartingPageView from "./views/StartingPageView.vue"
import CourseView from "./views/CourseView.vue"
import NoMoodle from "./views/NoMoodle.vue"

import MoodleIcon from "../icons/icon48.png"
import InfoIcon from "../icons/information.png"

sendEvent("pageview")

export default {
  components: {
    StartingPageView,
    CourseView,
    NoMoodle,
  },
  data: function() {
    return {
      activeTab: null,
      showStartingPageView: false,
      showCourseView: false,
      showNoMoodle: false,
      InfoIcon,
      MoodleIcon,
    }
  },
  methods: {
    onInfoClick: function() {
      browser.tabs.create({
        url: "../pages/information/information.html",
      })
      sendEvent("info-click")
    },
  },
  created: function() {
    getActiveTab().then(tab => {
      this.activeTab = tab

      if (this.activeTab.url.match(/http(s)?:\/\/([A-z]*\.)*[A-z]*\/my\//gi)) {
        this.showStartingPageView = true
        return
      }

      if (
        this.activeTab.url.match(/http(s)?:\/\/([A-z]*\.)*[A-z]*\/course\/view\.php\?id=[0-9]*/gi)
      ) {
        this.showCourseView = true
        return
      }

      this.showNoMoodle = true
    })
  },
}
</script>

<style>
.title {
  font-size: 24px;
  text-align: center;
  margin-bottom: 20px;
  margin-top: 15px;
}

.title-icon {
  width: 20px;
  height: 20px;
  margin: 0px 5px;
}

.content-container {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding: 0px 10px;
  font-size: 10px;
  font-weight: 500;
  color: #8f8f8f;
}

.footer-right-section {
  display: flex;
  align-items: center;
}

.info-icon {
  width: 16px;
  height: 16px;
  margin-left: 10px;
}

.info-icon:hover {
  cursor: pointer;
}
</style>
