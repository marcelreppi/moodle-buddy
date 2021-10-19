<template>
  <div class="w-full h-full px-3 pt-4 pb-2" :class="{ chrome: !isFirefox }">
    <div class="flex items-center justify-center mb-2 text-xl">
      Moodle Buddy
      <img class="w-5 h-5 ml-2" src="../icons/48.png" alt="logo" />
    </div>

    <div class="relative w-full h-full">
      <error-view v-if="showErrorView" />
      <rating-hint
        v-else-if="showRatingHint()"
        :active-tab="activeTab"
        :rate-hint-level="rateHintLevel"
        :total-downloaded-files="totalDownloadedFiles"
      ></rating-hint>
      <div v-else class="box-border relative flex flex-col items-center justify-center w-full">
        <dashboard-view
          v-if="showDashboardPageView"
          :active-tab="activeTab"
          :options="options"
        ></dashboard-view>
        <files-view
          v-if="showCourseView"
          :active-tab="activeTab"
          :options="options"
          view="course"
        ></files-view>
        <files-view
          v-if="showVideoServiceView"
          :active-tab="activeTab"
          :options="options"
          view="videoservice"
        ></files-view>
        <no-moodle
          v-if="showNoMoodle"
          :open-info-page="onInfoClick"
          :options="options"
          :n-updates="nUpdates"
        ></no-moodle>
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
  // eslint-disable-next-line import/no-unresolved
} from "types"

import { sendEvent, getActiveTab, isFirefox, navigateTo } from "../shared/helpers"
import FilesView from "./views/FilesView.vue"
import DashboardView from "./views/DashboardView.vue"
import NoMoodle from "./views/NoMoodle.vue"
import ErrorView from "./views/ErrorView.vue"
import RatingHint from "./components/RatingHint.vue"
import useRating from "./composables/useRating"

export default defineComponent({
  components: {
    FilesView,
    DashboardView,
    NoMoodle,
    ErrorView,
    RatingHint,
  },
  data() {
    return {
      isFirefox,
      activeTab: undefined as browser.tabs.Tab | undefined,
      isSupportedPage: false,
      page: "" as SupportedPage,
      showErrorView: false,
      options: {} as ExtensionOptions,
      nUpdates: 0,
      userHasRated: false,
      totalDownloadedFiles: 0,
      rateHintLevel: 1,
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

    getActiveTab().then(tab => {
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
    onOptionsClick() {
      browser.runtime.openOptionsPage()
      sendEvent("options-click", false)
    },
    onRateClick() {
      return useRating().onRateClick()
    },
    showRatingHint() {
      return (
        !this.userHasRated &&
        useRating().showRatingHint(this.rateHintLevel, this.totalDownloadedFiles)
      )
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
})
</script>
