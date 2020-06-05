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

<script>
const actionByType = {
  scan: "Scanning",
  download: "Downloading",
}

export default {
  props: {
    type: {
      type: String,
      required: true,
    },
    total: {
      type: Number,
      required: false,
      default: -1,
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
      errors: 0,
      completed: 0,
      progress: 5,
      done: false,
      cancelable: ["download"],
    }
  },
  computed: {
    progressText() {
      if (this.progress === 100) {
        return "Done!"
      }

      return [
        `${actionByType[this.type]}...`,
        `${this.completed}/${this.total !== -1 ? this.total : "?"}`,
        `${this.errors > 0 ? `(${this.errors} Error(s))` : ""}`,
      ].join(" ")
    },
  },
  methods: {
    setProgress(completed, total, errors) {
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
  },
  created() {
    this.$Progress.set(1) // Set a small number to make something visible
  },
}
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
