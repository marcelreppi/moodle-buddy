<template>
  <div
    class="flex flex-col items-center justify-center p-5 space-y-2 text-center bg-white border -bottom-3 shadow-custom"
  >
    <div>
      You have downloaded more than
      {{ rateHintLevels[rateHintLevel] }} files 🎉
    </div>
    <div>Thank you very much! 😄👌</div>
    <div>
      I would really appreciate your rating and review in the
      {{ isFirefox ? "Firefox Add-on Store" : "Chrome Web Store" }} 🙏
    </div>

    <div class="pt-3">
      <button class="btn" @click="() => onRateClick()">Rate Moodle Buddy</button>
      <div class="mt-2 text-xs text-gray-400 cursor-pointer" @click="onAvoidRateClick">
        I will have to disappoint you...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue"
import useRating from "../composables/useRating"
import { isFirefox } from "../../shared/helpers"

defineProps<{
  rateHintLevel: number
  totalDownloadedFiles: number
}>()

const { rateHintLevels, onRateClick, onAvoidRateClick } = useRating()
</script>
