<template>
  <div class="text-sm border-mb-red border-2 p-2 mb-5">
    <div class="text-center mb-1">Dev Tools</div>
    <div class="space-x-2">
      <button class="btn btn-xs btn-primary" @click="triggerBackgroundScan">BG Scan</button>
      <button class="btn btn-xs btn-primary" @click="clearCourses">Clear courses</button>
      <button class="btn btn-xs btn-primary" @click="resetStorage">Reset storage</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { activeTab } from "../state"
import { Message } from "../../types"
import logger from "../../shared/logger";

function triggerBackgroundScan() {
  if (activeTab.value?.id) {
    logger.debug(`[MB DevTools] Triggering background scan`)
    chrome.runtime.sendMessage({
      command: "background-scan"
    } satisfies Message)
  }
}

async function clearCourses() {
  logger.debug(`[MB DevTools] Clearing course data`)
  const { courseData: courseDataBefore } = (await chrome.storage.local.get("courseData"))
  logger.debug(`Stored courses before: ${Object.keys(courseDataBefore).length}`)
  await chrome.runtime.sendMessage({
    command: "clear-course-data",
  } satisfies Message)
  const { courseData: courseDataAfter } = (await chrome.storage.local.get("courseData"))
  logger.debug(`Stored courses after: ${Object.keys(courseDataAfter).length}`)
}

async function resetStorage() {
  logger.debug(`[MB DevTools] Resetting storage`)
  await chrome.runtime.sendMessage({
    command: "reset-storage",
  } satisfies Message)
}
</script>
