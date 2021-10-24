<template>
  <div>
    <div class="flex my-3">
      <div
        v-for="(tab, i) in tabs"
        :key="i"
        class="w-full tab"
        :class="{ 'active-tab': currentSelectionTab?.id === tab.id }"
        @click="() => setCurrentSelectionTab(tab)"
      >
        {{ tab.title }}
      </div>
    </div>
    <div v-for="(tab, i) in tabs" :key="i">
      <slot v-if="currentSelectionTab?.id === tab.id" :name="tab.id"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SelectionTab } from "../../types"
import { currentSelectionTab } from "../state"

const props = defineProps<{
  tabs: SelectionTab[]
}>()

const setCurrentSelectionTab = (tab: SelectionTab) => {
  currentSelectionTab.value = tab
}
currentSelectionTab.value = props.tabs[0]
</script>

<style>
.tab {
  @apply flex justify-center items-center border-b-[3px] border-gray-300 hover:cursor-pointer text-sm text-gray-600 pb-1.5;
}

.active-tab {
  @apply border-mb-red text-black;
}
</style>
