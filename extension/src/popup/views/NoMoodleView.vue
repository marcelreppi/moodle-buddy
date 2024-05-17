<template>
  <div class="content-container">
    <div v-if="nUpdates > 0" class="mb-3">
      There {{ nUpdates === 1 ? "is" : "are" }}
      <span class="font-semibold">
        {{ nUpdates }}
        {{ nUpdates === 1 ? "update" : "updates" }}
      </span>
      to your courses
    </div>
    <div v-if="showDefaultURLInput" class="mb-3 content-container text-center">
      Open one of your Moodle pages and you'll be able to navigate to your Moodle from here
    </div>
    <div v-else class="mb-3 link link-info" @click="goToMoodle()">Go to my Moodle</div>
    <hr class="w-5/6 my-2" />
    <div>This is an unsupported webpage.</div>
    <div class="mt-3">Make sure you are...</div>
    <ul class="list-disc">
      <li>on your university's Moodle page</li>
      <li>logged in</li>
      <li>
        on a
        <span class="link link-info" @click="openInfoPage">supported</span>
        Moodle webpage
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { options, nUpdates, updateState } from "../state"
import useNavigation from "../composables/useNavigation"

const { openMoodlePage, openInfoPage } = useNavigation()

const showDefaultURLInput = computed(
  () => options.value === undefined || options.value.defaultMoodleURL === ""
)

function goToMoodle() {
  nUpdates.value = 0
  openMoodlePage()
}
</script>

<style scoped>
.fade-leave-active {
  transition: all 0.5s;
}
.fade-enter-active {
  transition: all 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
