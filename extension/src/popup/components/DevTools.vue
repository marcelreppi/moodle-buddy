<template>
  <div class="text-sm border-mb-red border-2 p-2">
    <div class="text-center mb-2">Dev Tools</div>
    <div class="space-x-2 space-y-2">
      <button class="btn btn-xs btn-primary" @click="triggerBackgroundScan">BG Scan</button>
      <button class="btn btn-xs btn-primary" @click="openUpdatePage">Open update page</button>
      <button class="btn btn-xs btn-primary" @click="clearCourses">Clear courses</button>
      <button class="btn btn-xs btn-primary" @click="resetStorage">Reset storage</button>
      <button class="btn btn-xs btn-primary" @click="makeResourcesAppearAsNew">
        Make all resources appear as new
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { activeTab } from "../state"
import { ExtensionStorage, Message } from "@types"
import logger from "@shared/logger"
import { COMMANDS } from "@shared/constants"

function triggerBackgroundScan() {
  if (activeTab.value?.id) {
    logger.debug(`[MB DevTools] Triggering background scan`)
    chrome.runtime.sendMessage({
      command: COMMANDS.BACKGROUND_SCAN,
    } satisfies Message)
  }
}

async function clearCourses() {
  logger.debug(`[MB DevTools] Clearing course data`)
  const { courseData: courseDataBefore } = (await chrome.storage.local.get(
    "courseData"
  )) as ExtensionStorage
  logger.debug(`Stored courses before: ${Object.keys(courseDataBefore).length}`)
  await chrome.runtime.sendMessage({
    command: COMMANDS.CLEAR_COURSE_DATA,
  } satisfies Message)
  const { courseData: courseDataAfter } = (await chrome.storage.local.get(
    "courseData"
  )) as ExtensionStorage
  logger.debug(`Stored courses after: ${Object.keys(courseDataAfter).length}`)
}

async function resetStorage() {
  logger.debug(`[MB DevTools] Resetting storage`)
  await chrome.runtime.sendMessage({
    command: COMMANDS.RESET_STORAGE,
  } satisfies Message)
}

async function makeResourcesAppearAsNew() {
  logger.debug(`[MB DevTools] Make resources appear as new`)
  await chrome.runtime.sendMessage({
    command: COMMANDS.DEV_CLEAR_SEEN_RESOURCES,
  } satisfies Message)
}

async function openUpdatePage() {
  logger.debug(`[MB DevTools] Opening update page`)
  chrome.tabs.create({
    url: "/pages/update/update.html",
  })
}
</script>
