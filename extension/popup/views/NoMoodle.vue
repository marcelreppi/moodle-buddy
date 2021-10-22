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
    <div v-else class="mb-3 link" @click="navigateToMoodle">Go to my Moodle</div>
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

<script lang="ts">
import { defineComponent } from "vue"
import { options } from "../state"
import { sendEvent, validURLRegex } from "../../shared/helpers"

export default defineComponent({
  props: {
    openInfoPage: {
      type: Function,
      required: true,
    },
    nUpdates: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      moodleURL: options.value !== undefined ? options.value.defaultMoodleURL : "",
      urlInput: "",
      showInvalidURL: false,
    }
  },
  computed: {
    showDefaultURLInput(): boolean {
      return this.moodleURL === ""
    },
  },
  watch: {
    options(newOptions) {
      this.moodleURL = newOptions ? newOptions.defaultMoodleURL : ""
    },
  },
  methods: {
    async onSaveClick() {
      if (!this.urlInput.match(validURLRegex)) {
        this.showInvalidURL = true
        setTimeout(() => {
          this.showInvalidURL = false
        }, 2000)
        return
      }
      this.moodleURL = this.urlInput
      await browser.storage.local.set({
        options: { ...options.value, defaultMoodleURL: this.moodleURL },
      })
    },
    async navigateToMoodle() {
      await browser.tabs.create({
        url: this.moodleURL,
      })
      sendEvent("go-to-moodle", false)
      window.close()
    },
  },
})
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
