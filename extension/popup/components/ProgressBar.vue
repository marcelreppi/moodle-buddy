<template>
  <div class="flex flex-col items-center w-full mt-5">
    <div class="flex justify-between w-full text-sm">
      <div class="text-left">{{ progressText }}</div>
      <div v-if="cancelable.includes(type)" class="flex-row-reverse">
        <button v-if="!done" class="link" @click="onCancel">Cancel</button>
      </div>
    </div>
    <div class="w-full mt-1 border border-gray-300">
      <vue-progress-bar></vue-progress-bar>
    </div>
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */

import { defineComponent, PropType } from "vue"

type Actions = "scan" | "download"
const actionText: Record<Actions, string> = {
  scan: "Scanning",
  download: "Downloading",
}

export default defineComponent({
  props: {
    type: {
      type: String as PropType<Actions>,
      required: true,
    },
    onDone: {
      type: Function,
      required: false,
      default: () => {},
    },
    onCancel: {
      type: Function,
      required: false,
      default: () => {},
    },
  },
  data() {
    return {
      total: -1,
      completed: 0,
      errors: 0,
      progress: 0,
      done: false,
      cancelable: ["download"],
      $Progress: this.$Progress as any,
    }
  },
  computed: {
    progressText(): string {
      if (this.progress === 100) {
        return "Done!"
      }

      return [
        `${actionText[this.type]}...`,
        `${this.completed}/${this.total !== -1 ? this.total : "?"}`,
        `${this.errors > 0 ? `(${this.errors} Error(s))` : ""}`,
      ].join(" ")
    },
  },
  created() {
    this.resetProgress()
  },
  methods: {
    setProgress(total: number, completed = 0, errors = 0) {
      this.total = total
      this.completed = completed
      this.errors = errors

      if (this.total === 0) {
        // Handle edge case (eg. empty folders)
        this.progress = 100
      } else {
        this.progress = Math.ceil((this.completed / this.total) * 100) || 5
      }

      this.$Progress.set(this.progress)

      if (this.progress === 100) {
        this.done = true
        this.onDone()
      }
    },
    resetProgress() {
      this.total = -1
      this.completed = 0
      this.errors = 0
      this.progress = 0
      this.done = false

      // Set a small number to make something visible
      this.$Progress.set(5)
    },
  },
})
</script>

<style></style>
