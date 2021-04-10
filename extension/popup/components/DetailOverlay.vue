<template>
  <div class="detail-overlay">
    <div class="x-button" @click="toggleDetails">X</div>
    <div class="detail-container scrollbar">
      <div v-if="files.length > 0">
        <div class="detail-section-title">Files</div>
        <div class="details">
          <div v-for="(file, i) in files" :key="i">- {{ file.name }}</div>
        </div>
      </div>
      <div v-if="folders.length > 0">
        <div class="detail-section-title">Folders</div>
        <div class="details">
          <div v-for="(folder, i) in folders" :key="i">- {{ folder.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import { FileResource, FolderResource, Resource } from "moodle-buddy-types"

export default defineComponent({
  props: {
    resources: {
      type: Object as PropType<Resource[]>,
      required: true,
    },
    toggleDetails: Function,
  },
  computed: {
    files(): Resource[] {
      return this.resources.filter((n) => (n as FileResource).isFile)
    },
    folders(): Resource[] {
      return this.resources.filter((n) => (n as FolderResource).isFolder)
    },
  },
})
</script>

<style scoped>
.detail-overlay {
  position: absolute;
  box-sizing: border-box;
  --top-overlap: 7px;
  top: calc(var(--top-overlap) * -1);
  left: 0px;
  width: 100%;
  height: calc(100% + calc(var(--top-overlap) * 2));
  background: white;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  opacity: 98%;
  display: flex;
  flex-direction: column;
  padding: 7px 0px;
}

.detail-container {
  padding: 15px 30px 15px 30px;
  overflow-y: auto;
}

.x-button {
  position: absolute;
  top: 10px;
  right: 20px;
  font-weight: bold;
  font-size: 16px;
  padding: 5px;
}

.x-button:hover {
  cursor: pointer;
  color: #c50e20;
}

.detail-container > div {
  margin-bottom: 15px;
}

.detail-section-title {
  font-weight: bold;
}

.details {
  padding-left: 10px;
  word-wrap: break-word;
  hyphens: auto;
}
</style>
