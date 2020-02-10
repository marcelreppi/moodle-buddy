<template>
  <div class="app" :class="{ chrome: !isFirefox }">
    <div class="title">
      Moodle Buddy
      <img class="title-icon" :src="MoodleIcon" alt="logo" />
    </div>

    <div id="popup-content">
      <DashboardPageView
        v-if="showDashboardPageView"
        :activeTab="activeTab"
        :options="options"
      ></DashboardPageView>
      <CourseView v-if="showCourseView" :activeTab="activeTab" :options="options"></CourseView>
      <NoMoodle
        v-if="showNoMoodle"
        :openInfoPage="onInfoClick"
        :options="options"
        :nUpdates="nUpdates"
      ></NoMoodle>
    </div>

    <div class="footer">
      <span>
        <div class="link" @click="() => navigateTo('/pages/contact/contact.html')">
          Report a bug
        </div>
      </span>
      <span>
        <div class="link" @click="() => navigateTo(rateLink)">Rate</div>
      </span>
      <span>
        <div class="link" @click="onDonateClick">Donate</div>
      </span>
      <span class="footer-right-section">
        <img class="info-icon" :src="InfoIcon" alt="info" @click="onInfoClick" />
      </span>
    </div>
  </div>
</template>

<script>
import { sendEvent, getActiveTab, isFirefox } from "../shared/helpers"
import DashboardPageView from "./views/DashboardPageView.vue"
import CourseView from "./views/CourseView.vue"
import NoMoodle from "./views/NoMoodle.vue"

import MoodleIcon from "../icons/48.png"
import InfoIcon from "../static/information.png"

export default {
  components: {
    DashboardPageView,
    CourseView,
    NoMoodle,
  },
  data() {
    return {
      InfoIcon,
      MoodleIcon,
      activeTab: null,
      isSupportedPage: false,
      isDashboardPage: false,
      isCoursePage: false,
      options: null,
      nUpdates: 0,
    }
  },
  computed: {
    isFirefox,
    showDashboardPageView() {
      if (this.isSupportedPage && this.isDashboardPage) {
        sendEvent("view-dashboard-page", true)
        return true
      }
      return false
    },
    showCourseView() {
      if (this.isSupportedPage && this.isCoursePage) {
        sendEvent("view-course-page", true)
        return true
      }
      return false
    },
    showNoMoodle() {
      return !this.showDashboardPageView && !this.showCourseView
    },
    rateLink() {
      return this.isFirefox
        ? "https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/"
        : "https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo"
    },
  },
  methods: {
    onInfoClick() {
      this.navigateTo("/pages/information/information.html")
      sendEvent("info-click", false)
    },
    onDonateClick() {
      this.navigateTo("https://paypal.me/marcelreppi")
      sendEvent("donate-click", false)
    },
    navigateTo(link) {
      browser.tabs.create({
        url: link,
      })
      window.close()
    },
  },
  created() {
    browser.runtime.onMessage.addListener(message => {
      if (message.command === "state") {
        this.isSupportedPage = message.isSupportedPage
        this.isDashboardPage = message.isDashboardPage
        this.isCoursePage = message.isCoursePage
        this.options = message.options
        this.nUpdates = message.nUpdates

        if (process.env.NODE_ENV === "debug") {
          this.isSupportedPage = true
          const filename = this.activeTab.url.split("/").pop()
          if (filename.includes("course")) {
            this.isCoursePage = true
          } else {
            this.isDashboardPage = true
          }
        }
      }
    })

    getActiveTab().then(tab => {
      this.activeTab = tab
      // Get state on load from detector
      browser.tabs.sendMessage(this.activeTab.id, {
        command: "get-state",
      })
    })
  },
}
</script>

<style>
.app {
  font-size: 15px;
  padding: 25px 10px 5px 10px;
}

.chrome {
  padding-right: 25px;
}

.title {
  font-size: 24px;
  text-align: center;
  margin-bottom: 10px;
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

.bold {
  font-weight: 600;
}

hr {
  margin: 10px 0px;
  color: rgba(240, 240, 240, 0.347);
  border-color: rgba(240, 240, 240, 0.347);
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  font-size: 12px;
  color: #6f6f6f;
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
