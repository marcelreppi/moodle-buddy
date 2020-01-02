<template>
  <div class="app" :class="{ chrome: !isFirefox }">
    <div class="title">
      Moodle Buddy
      <img class="title-icon" :src="MoodleIcon" alt="logo" />
    </div>

    <div id="popup-content">
      <StartingPageView
        v-if="showStartingPageView"
        :activeTab="activeTab"
        :options="options"
      ></StartingPageView>
      <CourseView v-if="showCourseView" :activeTab="activeTab" :options="options"></CourseView>
      <NoMoodle v-if="showNoMoodle" :openInfoPage="onInfoClick"></NoMoodle>
    </div>

    <div class="footer">
      <span>
        Inofficial Plugin by
        <span class="link" @click="() => navigateTo('https://twitter.com/marcelreppi')"
          >marcelreppi</span
        >
      </span>
      <span>
        <div class="link" @click="onDonateClick">Donate</div>
      </span>
      <span class="footer-right-section">
        <div class="link" @click="() => navigateTo('https://github.com/marcelreppi/moodle-buddy')">
          GitHub
        </div>
        <img class="info-icon" :src="InfoIcon" alt="info" @click="onInfoClick" />
      </span>
    </div>
  </div>
</template>

<script>
import {
  sendEvent,
  getActiveTab,
  isFirefox,
  startingPageRegex,
  coursePageRegex,
} from "../shared/helpers"
import StartingPageView from "./views/StartingPageView.vue"
import CourseView from "./views/CourseView.vue"
import NoMoodle from "./views/NoMoodle.vue"

import MoodleIcon from "../icons/icon48.png"
import InfoIcon from "./static/images/information.png"

export default {
  components: {
    StartingPageView,
    CourseView,
    NoMoodle,
  },
  data() {
    return {
      activeTab: null,
      InfoIcon,
      MoodleIcon,
      currentURL: "",
      options: null,
    }
  },
  computed: {
    isFirefox,
    showStartingPageView() {
      if (this.activeTab && this.activeTab.url.match(startingPageRegex)) {
        sendEvent("view-start-page")
        return true
      }
      return false
    },
    showCourseView() {
      if (this.activeTab && this.activeTab.url.match(coursePageRegex)) {
        sendEvent("view-course-page")
        return true
      }
      return false
    },
    showNoMoodle() {
      return !this.showStartingPageView && !this.showCourseView
    },
  },
  methods: {
    onInfoClick() {
      browser.tabs.create({
        url: "../pages/information/information.html",
      })
      sendEvent("info-click")
      window.close()
    },
    onDonateClick() {
      this.navigateTo("https://paypal.me/marcelreppi")
      sendEvent("donate-click")
    },
    navigateTo(link) {
      browser.tabs.create({
        url: link,
      })
      window.close()
    },
  },
  created() {
    browser.storage.local
      .get("options")
      .then(({ options }) => {
        this.options = options
      })
      .then(getActiveTab)
      .then(tab => {
        this.activeTab = tab
      })
  },
}
</script>

<style>
.app {
  font-weight: 300;
  font-size: 16px;
  padding: 25px 10px 5px 10px;
}

.chrome {
  padding-right: 25px;
}

.title {
  font-size: 24px;
  text-align: center;
  margin-bottom: 20px;
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
  position: relative;
}

.link {
  color: blue;
  text-decoration: underline;
}

.link:hover {
  cursor: pointer;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  font-size: 12px;
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

.scrollbar {
  --scrollbarBG: #dcdcdc;
  --thumbBG: #c50e2080;
  scrollbar-width: thin;
  scrollbar-color: var(--thumbBG) var(--scrollbarBG);
}

.scrollbar::-webkit-scrollbar {
  width: 11px;
}

.scrollbar::-webkit-scrollbar-track {
  background: var(--scrollbarBG);
}
.scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--thumbBG);
  border-radius: 6px;
  border: 3px solid var(--scrollbarBG);
}
</style>