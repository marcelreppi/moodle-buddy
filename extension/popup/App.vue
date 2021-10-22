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
        :rate-hint-level="rateHintLevel"
        :total-downloaded-files="totalDownloadedFiles"
      ></rating-hint>
      <div v-else class="box-border relative flex flex-col items-center justify-center w-full">
        <dashboard-view v-if="showDashboardPageView"></dashboard-view>
        <files-view v-if="showCourseView" view="course"></files-view>
        <files-view v-if="showVideoServiceView" view="videoservice"></files-view>
        <no-moodle
          v-if="showNoMoodle"
          :open-info-page="onInfoClick"
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

<script setup lang="ts">
import { ref, computed } from "vue"
import { Message, StateMessage, SupportedPage } from "../types"
import {
  activeTab,
  options,
  nUpdates,
  userHasRated,
  totalDownloadedFiles,
  rateHintLevel,
} from "./state"

import { sendEvent, getActiveTab, isFirefox, navigateTo } from "../shared/helpers"
import FilesView from "./views/FilesView.vue"
import DashboardView from "./views/DashboardView.vue"
import NoMoodle from "./views/NoMoodle.vue"
import ErrorView from "./views/ErrorView.vue"
import RatingHint from "./components/RatingHint.vue"
import useRating from "./composables/useRating"

const page = ref<SupportedPage>()

const showDashboardPageView = computed(() => page.value === "dashboard")
const showCourseView = computed(() => page.value === "course")
const showVideoServiceView = computed(() => page.value === "videoservice")
const showNoMoodle = computed(() => page.value === undefined)
const showErrorView = ref(false)

const onReportBugClick = () => navigateTo("/pages/contact/contact.html")
const onInfoClick = () => {
  navigateTo("/pages/information/information.html")
  sendEvent("info-click", false)
}
const onDonateClick = () => {
  navigateTo("https://paypal.me/marcelreppi")
  sendEvent("donate-click", false)
}
const onOptionsClick = () => {
  browser.runtime.openOptionsPage()
  sendEvent("options-click", false)
}

const { onRateClick, showRatingHint } = useRating()

const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message

  if (command === "state") {
    const { page: detectedPage, state } = message as StateMessage
    page.value = detectedPage
    options.value = state.options
    nUpdates.value = state.nUpdates
    userHasRated.value = state.userHasRated
    totalDownloadedFiles.value = state.totalDownloadedFiles
    rateHintLevel.value = state.rateHintLevel
  }

  if (command === "error-view") {
    showErrorView.value = true
  }
}
browser.runtime.onMessage.addListener(messageListener)

getActiveTab().then((tab) => {
  activeTab.value = tab
  // Get state on load from detector
  if (activeTab.value?.id) {
    browser.tabs.sendMessage<Message>(activeTab.value.id, {
      command: "get-state",
    })
    browser.tabs.sendMessage<Message>(activeTab.value.id, {
      command: "track-page-view",
    })
  }
})
</script>
