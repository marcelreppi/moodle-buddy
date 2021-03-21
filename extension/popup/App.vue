<template>
  <div class="app" :class="{ chrome: !isFirefox }">
    <div class="title">
      Moodle Buddy
      <img class="title-icon" src="../icons/48.png" alt="logo" />
    </div>

    <div class="popup-content">
      <ErrorView v-if="showErrorView" />
      <div v-else>
        <DashboardPageView
          v-if="showDashboardPageView"
          :activeTab="activeTab"
          :options="options"
        ></DashboardPageView>
        <CourseView v-if="showCourseView" :activeTab="activeTab" :options="options"></CourseView>
        <VideoServiceView
          v-if="showVideoServiceView"
          :activeTab="activeTab"
          :options="options"
        ></VideoServiceView>
        <NoMoodle
          v-if="showNoMoodle"
          :openInfoPage="onInfoClick"
          :options="options"
          :nUpdates="nUpdates"
        ></NoMoodle>
      </div>

      <div v-if="showRatingHint" class="rating-hint">
        <div>You have downloaded more than {{ rateHintLevels[rateHintLevel] }} files 🎉</div>
        <div>Thank you very much! 😄👌</div>
        <div>
          I would really appreciate your rating and review <br />
          in the {{ isFirefox ? "Firefox Add-on Store" : "Chrome Web Store" }} 🙏
        </div>

        <div style="margin-top: 20px">
          <button @click="onRateClick">Rate Moodle Buddy</button>
          <div class="avoid-rate" @click="onAvoidRateClick">I will have to disappoint you...</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>
        <div class="link" @click="() => navigateTo('/pages/contact/contact.html')">
          Report a bug
        </div>
      </span>
      <span>
        <div class="link" @click="onRateClick">Rate</div>
      </span>
      <span>
        <div class="link" @click="onDonateClick">Donate</div>
      </span>
      <span>
        <div class="link" @click="onOptionsClick">Options</div>
      </span>
      <span class="footer-right-section">
        <img class="info-icon" src="../static/information.png" alt="info" @click="onInfoClick" />
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { Message, StateData, StateMessage } from "../types/messages.types"
import { ExtensionOptions, SupportedPage } from "../types/extension.types"
import { sendEvent, getActiveTab, isFirefox } from "../shared/helpers"
import DashboardPageView from "./views/DashboardPageView.vue"
import CourseView from "./views/CourseView.vue"
import VideoServiceView from "./views/VideoServiceView.vue"
import NoMoodle from "./views/NoMoodle.vue"
import ErrorView from "./views/ErrorView.vue"

export default defineComponent({
  components: {
    DashboardPageView,
    CourseView,
    VideoServiceView,
    NoMoodle,
    ErrorView,
  },
  data() {
    return {
      isFirefox: isFirefox(),
      activeTab: undefined as browser.tabs.Tab | undefined,
      isSupportedPage: false,
      page: "" as SupportedPage,
      showErrorView: false,
      options: {} as ExtensionOptions,
      nUpdates: 0,
      userHasRated: false,
      totalDownloadedFiles: 0,
      rateHintLevel: 1,
      rateHintLevels: {
        1: 50,
        2: 100,
        3: 250,
        4: 500,
        5: 1000,
        6: 1500,
        7: 3000,
        8: 5000,
        9: 7500,
        10: 10000,
      } as Record<string, number>,
      rateLink: isFirefox()
        ? "https://addons.mozilla.org/en-US/firefox/addon/moodle-buddy/"
        : "https://chrome.google.com/webstore/detail/moodle-buddy/nomahjpllnbcpbggnpiehiecfbjmcaeo",
    }
  },
  computed: {
    showDashboardPageView(): boolean {
      return this.page === "dashboard"
    },
    showCourseView(): boolean {
      return this.page === "course"
    },
    showVideoServiceView(): boolean {
      return this.page === "videoservice"
    },
    showNoMoodle(): boolean {
      return this.page === ""
    },
    showRatingHint(): boolean {
      const fileThreshold = this.rateHintLevels[this.rateHintLevel] || Infinity
      return this.showCourseView && !this.userHasRated && this.totalDownloadedFiles > fileThreshold
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
    onRateClick() {
      if (!this.activeTab?.id) return

      this.userHasRated = true
      browser.tabs.sendMessage<Message>(this.activeTab.id, {
        command: "rate-click",
      })
      this.navigateTo(this.rateLink)
      sendEvent("rate-click", false)
    },
    onOptionsClick() {
      browser.runtime.openOptionsPage()
      sendEvent("options-click", false)
    },
    navigateTo(link: string) {
      browser.tabs.create({
        url: link,
      })
      window.close()
    },
    onAvoidRateClick() {
      if (!this.activeTab?.id) return

      this.userHasRated = true
      browser.tabs.sendMessage<Message>(this.activeTab.id, {
        command: "avoid-rate-click",
      })
      sendEvent("avoid-rating-hint")
    },
    cacheStorageData(data: StateData) {
      const { options, nUpdates, userHasRated, totalDownloadedFiles, rateHintLevel } = data
      this.options = options
      this.nUpdates = nUpdates
      this.userHasRated = userHasRated
      this.totalDownloadedFiles = totalDownloadedFiles
      this.rateHintLevel = rateHintLevel
    },
  },
  created() {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
      const { command } = message as Message

      if (command === "state") {
        const { page, state } = message as StateMessage
        this.cacheStorageData(state)
        this.page = page

        if (process.env.NODE_ENV === "debug") {
          let filename = ""
          if (this.activeTab && this.activeTab.url) {
            filename = this.activeTab.url.split("/").pop() || ""
          }

          if (filename.includes("course")) {
            this.page = "course"
          }

          if (filename.includes("dashboard")) {
            this.page = "dashboard"
          }

          if (filename.includes("videoservice")) {
            this.page = "videoservice"
          }
        }

        if (this.page !== "") {
          sendEvent(`view-${this.page}-page`, true)
        }
      }

      if (command === "error-view") {
        this.showErrorView = true
      }
    }
    browser.runtime.onMessage.addListener(messageListener)

    getActiveTab().then((tab) => {
      this.activeTab = tab
      // Get state on load from detector
      if (this.activeTab?.id) {
        browser.tabs.sendMessage<Message>(this.activeTab.id, {
          command: "get-state",
        })
        // .catch(() => {
        //   // When detector is not available fetch state from storage manually
        //   browser.storage.local.get().then(this.cacheStorageData)
        // })
      }
    })
  },
})
</script>

<style>
.app {
  font-size: 15px;
  padding: 15px 10px 5px 10px;
}

.chrome {
  padding-right: 25px;
}

.title {
  font-size: 22px;
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

.popup-content {
  width: 100%;
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

.rating-hint {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: -10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0px 30px;
  text-align: center;
  background: white;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.rating-hint > div:nth-of-type(n + 1) {
  margin-top: 5px;
}

.rating-hint button {
  padding: 10px 10px;
  border-radius: 5px;
  border: 0;
  background-color: #c50e20;
  color: white;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.avoid-rate {
  font-size: 12px;
  color: #6f6f6f;
  margin-top: 10px;
  cursor: pointer;
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
