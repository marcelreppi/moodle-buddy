<template>
  <div class="w-full h-full px-3 pt-4 pb-2" :class="{ chrome: !isFirefox }">
    <div class="flex items-center justify-center mb-2 text-xl">
      Moodle Buddy
      <img class="w-5 h-5 ml-1" src="../icons/48.png" alt="logo" />
    </div>

    <div class="relative w-full h-full">
      <ErrorView v-if="showErrorView" />
      <div class="box-border relative flex flex-col items-center justify-center w-full" v-else>
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

      <div
        v-if="showRatingHint"
        class="absolute top-0 left-0 right-0 flex flex-col items-center justify-center px-5 space-y-2 text-center bg-white border -bottom-3 shadow-custom"
      >
        <div>You have downloaded more than {{ rateHintLevels[rateHintLevel] }} files 🎉</div>
        <div>Thank you very much! 😄👌</div>
        <div>
          I would really appreciate your rating and review in the
          {{ isFirefox ? "Firefox Add-on Store" : "Chrome Web Store" }} 🙏
        </div>

        <div class="pt-3">
          <button class="btn" @click="onRateClick">Rate Moodle Buddy</button>
          <div class="mt-2 text-xs text-gray-400 cursor-pointer" @click="onAvoidRateClick">
            I will have to disappoint you...
          </div>
        </div>
      </div>
    </div>

    <footer class="flex items-center justify-between text-xs mt-7">
      <span>
        <div class="link" @click="onReportBugClick">Report a bug</div>
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
      <img
        class="w-4 h-4 hover:cursor-pointer"
        src="../static/information.png"
        alt="info"
        @click="onInfoClick"
      />
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import {
  Message,
  StateData,
  StateMessage,
  ExtensionOptions,
  SupportedPage,
} from "moodle-buddy-types"

import { sendEvent, getActiveTab, isFirefox, navigateTo } from "../shared/helpers"
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
    onReportBugClick() {
      navigateTo("/pages/contact/contact.html")
    },
    onInfoClick() {
      navigateTo("/pages/information/information.html")
      sendEvent("info-click", false)
    },
    onDonateClick() {
      navigateTo("https://paypal.me/marcelreppi")
      sendEvent("donate-click", false)
    },
    onRateClick() {
      if (!this.activeTab?.id) return

      this.userHasRated = true
      browser.tabs.sendMessage<Message>(this.activeTab.id, {
        command: "rate-click",
      })
      navigateTo(this.rateLink)
      sendEvent("rate-click", false)
    },
    onOptionsClick() {
      browser.runtime.openOptionsPage()
      sendEvent("options-click", false)
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
