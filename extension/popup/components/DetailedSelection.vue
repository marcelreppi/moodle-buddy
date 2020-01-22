<template>
  <div class="detailed-selection">
    <input type="text" v-model="searchInput" placeholder="Search..." />
    <div
      class="selection scrollbar"
      @mousedown="() => setMouseDown(true)"
      @mouseup="() => setMouseDown(false)"
    >
      <label
        v-for="(r, i) in filteredResources"
        :key="i"
        :id="`cb${i}`"
        :data-href="r.href"
        @mousemove="onMouseOver"
        @input="onCheck"
      >
        <span>{{ r.fileName || r.folderName }}</span>
        <a :href="r.href" class="link" @click.prevent="onLinkClick">Open</a>
        <div>
          <input :ref="`cb${i}`" type="checkbox" :checked="r.selected" />
        </div>
      </label>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    resources: Array,
    setResourceSelected: Function,
    onlyNewResources: Boolean,
  },
  data() {
    return {
      mouseDown: false,
      searchInput: "",
    }
  },
  computed: {
    filteredResources() {
      if (this.searchInput === "") {
        if (this.onlyNewResources) {
          return this.resources.filter(r => r.isNewResource)
        }

        return this.resources
      }

      return this.resources.filter(r => {
        let isMatch = false
        if (r.isFile) {
          isMatch = r.fileName.match(new RegExp(this.searchInput, "gi"))
        }

        if (r.isFolder) {
          isMatch = r.folderName.match(new RegExp(this.searchInput, "gi"))
        }

        if (this.onlyNewResources) {
          return r.isNewResource && isMatch
        }

        return isMatch
      })
    },
  },
  methods: {
    onMouseOver(e) {
      if (this.mouseDown) {
        const cbId = e.target.parentElement.id
        this.$refs[cbId][0].checked = true

        const { href } = e.target.parentElement.dataset
        this.setResourceSelected(href, true)
      }
    },
    setMouseDown(isDown) {
      this.mouseDown = isDown
    },
    onCheck(e) {
      const { href } = e.currentTarget.dataset
      this.setResourceSelected(href, e.target.checked)
    },
    onLinkClick(e) {
      browser.tabs.create({
        url: e.target.href,
      })
      window.close()
    },
  },
}
</script>

<style scoped>
.detailed-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80%;
  padding-top: 5px;
}

input[type="text"] {
  font-family: inherit;
  font-size: 13px;
  padding: 0 10px 5px 10px;
  border: 0;
  border-bottom: 1px solid #dcdcdc;
  width: 100%;
}

.selection {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  margin-top: 5px;
  width: 100%;
  height: 150px;
  overflow-y: scroll;
  padding-right: 10px;
}

label {
  display: grid;
  grid-template-columns: 10fr 1fr 1fr;
}

label:hover {
  cursor: pointer;
  background-color: #dcdcdc53;
}

label span {
  text-align: left;
}

label a {
  width: 100%;
  text-align: center;
}

label div {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

label input {
  border: none;
}
</style>
