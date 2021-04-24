<template>
  <div class="progress-bar-container">
    <div class="progress-bar-label">
      <div style="text-align: left">{{ progressText }}</div>
      <div v-if="cancelable.includes(type)" class="cancel-button">
        <button v-if="!done" class="link" @click="onCancel">Cancel</button>
      </div>
    </div>
    <div class="progress-bar">
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

<style>
.progress-bar-container {
  margin-top: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-bar-label {
  display: grid;
  grid-template-columns: auto 20px;
  font-size: 13px;
  width: 100%;
}

.cancel-button {
  display: flex;
  flex-direction: row-reverse;
}

.progress-bar {
  margin-top: 3px;
  border: 1px solid #dcdcdc;
  width: 100%;
}
</style>
