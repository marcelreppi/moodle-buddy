<template>
  <div class="flex flex-col items-center w-full mt-5">
    <div class="flex justify-between w-full text-sm">
      <div class="text-left">{{ progressText }}</div>
      <div v-if="cancelable && !done" class="flex-row-reverse">
        <button class="btn btn-xs btn-ghost" @click="onCancel">Cancel</button>
      </div>
    </div>
    <progress class="progress progress-success w-full h-4 mt-1" :value="progress" :max="MAX_PROGRESS"></progress>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

type Actions = "scan" | "download"
const actionText: Record<Actions, string> = {
  scan: "Scanning",
  download: "Downloading",
}
const MAX_PROGRESS = 100
const DEFAULT_PROGRESS = 5

const props = withDefaults(defineProps<{
  action: Actions
  cancelable?: boolean
  isPending?: boolean
  onDone?: () => void
  onCancel?: () => void
}>(), {
  cancelable: true,
  isPending: false,
  onDone: () => {},
  onCancel: () => {},
})

const total = ref(-1)
const completed = ref(0)
const errors = ref(0)
const progress = ref(DEFAULT_PROGRESS)
const done = ref(false)

const progressText = computed(() => {
  const textPieces: string[] = []

  if (progress.value === MAX_PROGRESS) {
    textPieces.push("Done!")
  } else if (props.isPending) {
    textPieces.push(`Pending...`)
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
    progress.value = MAX_PROGRESS
  } else {
    progress.value = Math.ceil((completed.value / total.value) * MAX_PROGRESS) || DEFAULT_PROGRESS
  }

  if (progress.value === MAX_PROGRESS) {
    done.value = true

    if (props.onDone) props.onDone()
  }
}

const resetProgress = () => {
  total.value = -1
  completed.value = 0
  errors.value = 0
  progress.value = DEFAULT_PROGRESS
  done.value = false
}

defineExpose({
  setProgress,
  resetProgress,
})

resetProgress()
</script>

<style></style>
