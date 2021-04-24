<template>
  <div
    class="absolute left-0 flex flex-col w-full h-[110%] bg-white rounded -top-1 shadow-custom py-1"
  >
    <div
      class="absolute text-lg font-bold top-4 right-6 hover:text-mb-red hover:cursor-pointer"
      @click="toggleDetails"
    >
      X
    </div>
    <div class="px-8 py-4 space-y-2 overflow-auto scrollbar">
      <div v-if="files.length > 0">
        <div class="font-bold">Files</div>
        <div class="pl-3 break-normal">
          <div v-for="(file, i) in files" :key="i">‣ {{ file.name }}</div>
        </div>
      </div>
      <div v-if="folders.length > 0">
        <div class="font-bold">Folders</div>
        <div class="pl-3 break-normal">
          <div v-for="(folder, i) in folders" :key="i">‣ {{ folder.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { FileResource, FolderResource, Resource } from "moodle-buddy-types"

export default defineComponent({
  props: {
    resources: {
      type: Object as PropType<Resource[]>,
      required: true,
    },
    toggleDetails: Function,
  },
  setup({ resources }) {
    const files = computed<Resource[]>(() => {
      return resources.filter((n) => (n as FileResource).isFile)
    })

    const folders = computed<Resource[]>(() => {
      return resources.filter((n) => (n as FolderResource).isFolder)
    })

    return {
      files,
      folders,
    }
  },
})
</script>

<style></style>
