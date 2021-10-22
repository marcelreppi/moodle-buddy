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
    <div v-if="showDefaultURLInput" class="mb-3 content-container">
      <div>Want to navigate to your Moodle from here?</div>
      <div>Paste the URL below:</div>
      <div>
        <input
          v-model="urlInput"
          class="w-64 mr-1 border border-gray-400 rounded-md focus:border-gray-500"
          type="text"
          name=""
        />
        <button class="py-0.5 btn" @click="onSaveClick">Save</button>
      </div>
      <transition name="fade">
        <div
          v-if="showInvalidURL"
          class="px-3 py-2 mt-4 font-bold text-center text-white bg-black rounded-md shadow-custom"
        >
          Invalid URL!
        </div>
      </transition>
    </div>
    <div v-else class="mb-3 link" @click="openMoodlePage">Go to my Moodle</div>
    <hr class="w-5/6 my-2" />
    <div>This is an unsupported webpage.</div>
    <div class="mt-3">Make sure you are...</div>
    <ul class="list-disc">
      <li>on your university's Moodle page</li>
      <li>logged in</li>
      <li>
        on a
        <span class="link" @click="openInfoPage">supported</span>
        Moodle webpage
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { options, nUpdates, updateState } from "../state"
import { validURLRegex } from "../../shared/helpers"
import useNavigation from "../composables/useNavigation"

const { openMoodlePage, openInfoPage } = useNavigation()

const showDefaultURLInput = computed(
  () => options.value === undefined || options.value.defaultMoodleURL === ""
)

const urlInput = ref("")
const showInvalidURL = ref(false)

const onSaveClick = async () => {
  console.log(urlInput.value)
  if (!urlInput.value.match(validURLRegex)) {
    showInvalidURL.value = true
    setTimeout(() => {
      showInvalidURL.value = false
    }, 2000)
    return
  }

  await browser.storage.local.set({
    options: { ...options.value, defaultMoodleURL: urlInput.value },
  })
  updateState()
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
