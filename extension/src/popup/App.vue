<template>
  <div class="relative w-full h-full px-3 pt-4 pb-2" :class="{ chrome: !isFirefox }">
    <template v-if="isDev">
      <dev-tools></dev-tools>
      <div class="divider"></div>
    </template>
    <div class="flex items-center justify-center mb-2 text-lg">
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
            <course-view v-if="showCourseView"></course-view>
            <video-service-view v-if="showVideoServiceView"></video-service-view>
            <no-moodle-view v-if="showNoMoodle"></no-moodle-view>
          </template>
        </template>
      </div>
    </div>

    <mb-footer></mb-footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { Message, StateMessage, SupportedPage } from "@types"
import {
  activeTab,
  options,
  nUpdates,
  userHasRated,
  totalDownloadedFiles,
  rateHintLevel,
  updateState,
} from "./state"

import { getActiveTab, isDev, isFirefox } from "@shared/helpers"
import DevTools from "./components/DevTools.vue"
import CourseView from "./views/CourseView.vue"
import VideoServiceView from "./views/VideoServiceView.vue"
import DashboardView from "./views/DashboardView.vue"
import NoMoodleView from "./views/NoMoodleView.vue"
import ErrorView from "./views/ErrorView.vue"
import MbFooter from "./components/MbFooter.vue"
import RatingHint from "./components/RatingHint.vue"
import useRating from "./composables/useRating"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

logger.debug({ env: process.env.NODE_ENV, isDev })

const page = ref<SupportedPage>()

const showDashboardPageView = computed(() => page.value === "dashboard")
const showCourseView = computed(() => page.value === "course")
const showVideoServiceView = computed(() => page.value === "videoservice")
const showNoMoodle = computed(() => page.value === undefined)
const showErrorView = ref(false)
const showLoading = ref(true)

const { showRatingHint } = useRating()

chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { command } = message

  if (command === COMMANDS.STATE) {
    const { state } = message as StateMessage
    page.value = state.page
    options.value = state.options
    nUpdates.value = state.nUpdates
    userHasRated.value = state.userHasRated
    totalDownloadedFiles.value = state.totalDownloadedFiles
    rateHintLevel.value = state.rateHintLevel
  }

  if (command === COMMANDS.ERROR_VIEW) {
    showErrorView.value = true
  }

  showLoading.value = false
})

getActiveTab().then((tab) => {
  activeTab.value = tab

  if (activeTab.value?.id) {
    updateState()
    chrome.tabs.sendMessage(activeTab.value.id, {
      command: COMMANDS.TRACK_PAGE_VIEW,
    } satisfies Message)
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
