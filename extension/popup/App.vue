<template>
  <div class="w-full h-full px-3 pt-4 pb-2" :class="{ chrome: !isFirefox }">
    <div class="flex items-center justify-center mb-2 text-xl">
      Moodle Buddy
      <img class="w-5 h-5 ml-2" src="../icons/48.png" alt="logo" />
    </div>

    <div class="relative w-full h-full">
      <div class="box-border relative flex flex-col items-center justify-center w-full">
        <svg v-if="showLoading" class="my-10" viewBox="25 25 50 50">
          <circle cx="50" cy="50" r="20"></circle>
        </svg>
        <template v-else>
          <error-view v-if="showErrorView" />
          <rating-hint v-else-if="showRatingHint"></rating-hint>
          <template v-else>
            <dashboard-view v-if="showDashboardPageView"></dashboard-view>
            <files-view v-if="showCourseView" view="course"></files-view>
            <files-view v-if="showVideoServiceView" view="videoservice"></files-view>
            <no-moodle-view v-if="showNoMoodle"></no-moodle-view>
          </template>
        </template>
      </div>
    </div>

    <footer class="flex items-center justify-between text-xs mt-7">
      <span>
        <div class="link" @click="openContactPage">Report a bug</div>
      </span>
      <span>
        <div class="link" @click="onRateClick">Rate</div>
      </span>
      <span>
        <div class="link" @click="openDonatePage">Donate</div>
      </span>
      <span>
        <div class="link" @click="openOptionsPage">Options</div>
      </span>
      <img
        class="w-4 h-4 hover:cursor-pointer"
        src="../static/information.png"
        alt="info"
        @click="openInfoPage"
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
  updateState,
} from "./state"

import { getActiveTab, isFirefox } from "../shared/helpers"
import FilesView from "./views/FilesView.vue"
import DashboardView from "./views/DashboardView.vue"
import NoMoodleView from "./views/NoMoodleView.vue"
import ErrorView from "./views/ErrorView.vue"
import RatingHint from "./components/RatingHint.vue"
import useRating from "./composables/useRating"
import useNavigation from "./composables/useNavigation"

const page = ref<SupportedPage>()

const showDashboardPageView = computed(() => page.value === "dashboard")
const showCourseView = computed(() => page.value === "course")
const showVideoServiceView = computed(() => page.value === "videoservice")
const showNoMoodle = computed(() => page.value === undefined)
const showErrorView = ref(false)
const showLoading = ref(true)

const { openContactPage, openDonatePage, openInfoPage, openOptionsPage } = useNavigation()
const { onRateClick, showRatingHint } = useRating()

const messageListener: browser.runtime.onMessageEvent = async (message: object) => {
  const { command } = message as Message

  if (command === "state") {
    const { state } = message as StateMessage
    page.value = state.page
    options.value = state.options
    nUpdates.value = state.nUpdates
    userHasRated.value = state.userHasRated
    totalDownloadedFiles.value = state.totalDownloadedFiles
    rateHintLevel.value = state.rateHintLevel
  }

  if (command === "error-view") {
    showErrorView.value = true
  }

  showLoading.value = false
}
browser.runtime.onMessage.addListener(messageListener)

getActiveTab().then((tab) => {
  activeTab.value = tab

  if (activeTab.value?.id) {
    updateState()
    browser.tabs.sendMessage<Message>(activeTab.value.id, {
      command: "track-page-view",
    })
  }
})
</script>

<style scoped>
/* Loading Spinner */
svg {
  width: 3.75em;
  transform-origin: center;
  animation: rotate 2s linear infinite;
}

circle {
  fill: none;
  stroke: var(--mb-red);
  stroke-width: 2;
  stroke-dasharray: 1, 200;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 200;
    stroke-dashoffset: -35px;
  }
  100% {
    stroke-dashoffset: -125px;
  }
}
</style>
