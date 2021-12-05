<template>
  <div class="flex flex-col items-center w-full mt-5">
    <div class="flex justify-between w-full text-sm">
      <div class="text-left">{{ progressText }}</div>
      <div v-if="cancelable.includes(action)" class="flex-row-reverse">
        <button v-if="!done" class="link" @click="onCancel">Cancel</button>
      </div>
    </div>
    <div class="w-full mt-1 border border-gray-300">
      <vue-progress-bar></vue-progress-bar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref } from "vue"

type Actions = "scan" | "download"
const actionText: Record<Actions, string> = {
  scan: "Scanning",
  download: "Downloading",
}

const props = defineProps<{
  action: Actions
  onDone?: () => void
  onCancel?: () => void
}>()

const total = ref(-1)
const completed = ref(0)
const errors = ref(0)
const progress = ref(0)
const done = ref(false)
const cancelable = ref(["download"])

const internalInstance = getCurrentInstance()
const $Progress = internalInstance?.appContext.config.globalProperties.$Progress

const progressText = computed(() => {
  const textPieces: string[] = []

  if (progress.value === 100) {
    textPieces.push("Done!")
  } else {
    textPieces.push(
      `${actionText[props.action]}...`,
      `${completed.value}/${total.value !== -1 ? total.value : "?"}`
    )
  }

  if (errors.value > 0) {
    textPieces.push(`(${errors.value} Error${errors.value === 1 ? "" : "s"})`)
  }

  return textPieces.join(" ")
})

const setProgress = (newTotal: number, newCompleted = 0, newErrors = 0) => {
  total.value = newTotal
  completed.value = newCompleted
  errors.value = newErrors

  if (total.value === 0) {
    // Handle edge case (eg. empty folders)
    progress.value = 100
  } else {
    progress.value = Math.ceil((completed.value / total.value) * 100) || 5
  }

  $Progress.set(progress.value)

  if (progress.value === 100) {
    done.value = true

    if (props.onDone) props.onDone()
  }
}

const resetProgress = () => {
  total.value = -1
  completed.value = 0
  errors.value = 0
  progress.value = 0
  done.value = false

  // Set a small number to make something visible
  $Progress.set(5)
}

defineExpose({
  setProgress,
  resetProgress,
})

resetProgress()
</script>

<style></style>
