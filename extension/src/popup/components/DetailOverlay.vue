<template>
  <div
    class="absolute left-0 top-0 flex flex-col w-full h-full bg-white rounded shadow-custom pb-3"
  >
    <XIcon
      class="w-7 absolute right-5 top-3 stroke-current hover:text-mb-red hover:cursor-pointer"
      @click="toggleDetails"
    ></XIcon>
    <div class="px-8 py-4 space-y-2 overflow-auto scrollbar">
      <div v-if="files.length > 0">
        <div class="font-bold">Files</div>
        <div class="pl-3 break-normal">
          <div v-for="(file, i) in files" :key="i">
            <div class="inline-block right-arrow"></div>
            {{ file.name }} {{ getHintText(file) }}
          </div>
        </div>
      </div>
      <div v-if="folders.length > 0">
        <div class="font-bold">Folders</div>
        <div class="pl-3 break-normal">
          <div v-for="(folder, i) in folders" :key="i">
            <div class="inline-block right-arrow"></div>
            {{ folder.name }} {{ getHintText(folder) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Resource } from "types"
import { computed } from "vue"
import { isFile, isFolder } from "../../shared/resourceHelpers"
import { XIcon } from "@heroicons/vue/outline"

const props = defineProps<{
  resources: Resource[]
  toggleDetails: () => void
}>()

const files = computed<Resource[]>(() => props.resources.filter(isFile))
const folders = computed<Resource[]>(() => props.resources.filter(isFolder))

const getHintText = (r: Resource) => {
  if (r.isNew) return "(new)"
  if (r.isUpdated) return "(updated)"
  return ""
}
</script>

<style>
.right-arrow {
  width: 0;
  height: 0;
  border-top: 3px solid transparent;
  border-bottom: 3px solid transparent;
  border-left: 6px solid var(--mb-red);
  margin-bottom: 3px;
  margin-right: 2px;
}
</style>
