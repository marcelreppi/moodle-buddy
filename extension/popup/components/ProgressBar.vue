<template>
  <div class="progress-bar-container">
    <div class="progress-bar-label">{{ progressText }}</div>
    <div class="progress-bar">
      <vue-progress-bar></vue-progress-bar>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    action: {
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
  },
  data() {
    return {
      currentTotal: this.$props.total,
      progressText: `${this.action}... 0/${this.$props.total || "?"}`,
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
        this.onDone()
        return
      }

      this.progressText = `${this.action}... ${completed}/${this.currentTotal}`
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
  align-self: flex-start;
  font-size: 13px;
}

.progress-bar {
  margin-top: 3px;
  border: 1px solid #dcdcdc;
  width: 100%;
}
</style>
