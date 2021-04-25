<template>
  <div>
    <div class="flex my-3">
      <div
        v-for="(tab, i) in tabs"
        :key="i"
        class="w-full tab"
        :class="{ 'active-tab': selectionTab.id === tab.id }"
        @click="() => setSelectionTab(tab)"
      >
        {{ tab.title }}
      </div>
    </div>
    <div v-for="(tab, i) in tabs" :key="i">
      <slot v-if="selectionTab.id === tab.id" :name="tab.id"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { PropType, Ref, defineComponent } from "vue"
import { SelectionTab } from "../types"

export default defineComponent({
  props: {
    tabs: {
      type: Array as PropType<SelectionTab[]>,
      required: true,
    },
    selectionTab: {
      type: Object as PropType<Ref<SelectionTab>>,
      required: true,
    },
    setSelectionTab: {
      type: Function,
      required: true,
    },
  },
})
</script>

<style>
.tab {
  @apply flex justify-center items-center border-b-[3px] border-gray-300 hover:cursor-pointer text-sm text-gray-600 pb-1.5;
}

.active-tab {
  @apply border-mb-red text-black;
}
</style>
