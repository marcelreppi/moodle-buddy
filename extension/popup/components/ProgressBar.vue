<template>
  <div class="progress-bar-container">
    <div class="progress-bar-label">
      <div style="text-align: left">{{ progressText }}</div>
      <div v-if="cancelable.indexOf(type) !== -1" class="cancel-button">
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
      default: 0,
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
      currentTotal: this.$props.total,
      progressText: `${actionByType[this.type]}... 0/${this.$props.total || "?"}`,
      done: false,
      cancelable: ["download"],
    }
  },
  methods: {
    setProgress(completed, total) {
      this.currentTotal = total

      if (this.currentTotal === 0) {
        // Handle edge case (eg. empty folders)
        this.$Progress.set(100)
        this.progressText = "Done!"

        if (this.onDone) this.onDone()
        return
      }

      this.$Progress.set(Math.ceil((completed / this.currentTotal) * 100))

      if (completed === this.currentTotal) {
        this.progressText = "Done!"
        this.done = true
        this.onDone()
        return
      }

      this.progressText = `${actionByType[this.type]}... ${completed}/${this.currentTotal}`
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
  grid-template-columns: repeat(2, 1fr);
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
