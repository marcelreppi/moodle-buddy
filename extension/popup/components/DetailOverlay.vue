<template>
  <div class="detail-overlay">
    <div class="x-button" @click="toggleDetails">X</div>
    <div class="detail-container scrollbar">
      <div v-if="files.length > 0">
        <div class="detail-section-title">Files</div>
        <div class="details">
          <div v-for="(file, i) in files" :key="i">- {{ file.filename }}</div>
        </div>
      </div>
      <div v-if="folders.length > 0">
        <div class="detail-section-title">Folders</div>
        <div class="details">
          <div v-for="(folder, i) in folders" :key="i">- {{ folder.filename }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    resources: Array,
    toggleDetails: Function,
  },
  computed: {
    files() {
      return this.resources.filter(n => n.isFile)
    },
    folders() {
      return this.resources.filter(n => n.isFolder)
    },
  },
}
</script>

<style scoped>
.detail-overlay {
  position: absolute;
  box-sizing: border-box;
  --top-overlap: 10px;
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
}

.detail-container {
  margin: 5px 0px;
  padding: 15px 30px 0px 30px;
  overflow-y: auto;
}

.x-button {
  position: absolute;
  top: 10px;
  right: 20px;
  font-weight: bold;
  font-size: 16px;
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
