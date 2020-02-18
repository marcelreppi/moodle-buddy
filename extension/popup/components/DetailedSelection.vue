<template>
  <div class="detailed-selection">
    <input type="text" v-model="searchInput" placeholder="Search..." />
    <div
      class="selection scrollbar"
      @mousedown="() => setMouseDown(true)"
      @mouseup="() => setMouseDown(false)"
      ref="selectionContainer"
      :style="selectionContainerStyle"
    >
      <div v-if="filteredResources.length > 0">
        <label class="category" @input="e => onCategoryClick(e, 'all')">
          <span>All</span>
          <div>
            <input ref="allCb" type="checkbox" />
          </div>
        </label>
      </div>

      <div v-if="fileResources.length > 0">
        <label class="category" @input="e => onCategoryClick(e, 'file')">
          <span>Files</span>
          <div>
            <input ref="filesCb" type="checkbox" />
          </div>
        </label>
        <label
          v-for="(r, i) in fileResources"
          :key="`fileCb${i}`"
          :id="`fileCb${i}`"
          :data-href="r.href"
          class="resource"
          @mousemove="onMouseOver"
          @input="onCheck"
        >
          <span class="resource">{{ r.fileName || r.folderName }}</span>
          <a :href="r.href" class="link" @click.prevent="onLinkClick">Open</a>
          <div>
            <input :data-href="r.href" :ref="`fileCb${i}`" type="checkbox" :checked="r.selected" />
          </div>
        </label>
      </div>

      <div v-if="folderResources.length > 0">
        <label class="category" @input="e => onCategoryClick(e, 'folder')">
          <span>Folders</span>
          <div>
            <input ref="foldersCb" type="checkbox" />
          </div>
        </label>
        <label
          v-for="(r, i) in folderResources"
          :key="`folderCb${i}`"
          :id="`folderCb${i}`"
          :data-href="r.href"
          class="resource"
          @mousemove="onMouseOver"
          @input="onCheck"
        >
          <span class="resource">{{ r.fileName || r.folderName }}</span>
          <a :href="r.href" class="link" @click.prevent="onLinkClick">Open</a>
          <div>
            <input
              :data-href="r.href"
              :ref="`folderCb${i}`"
              type="checkbox"
              :checked="r.selected"
            />
          </div>
        </label>
      </div>
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
      selectionContainerStyle: {
        height: "auto",
        "overflow-y": "hidden",
      },
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
    fileResources() {
      return this.filteredResources.filter(r => r.isFile)
    },
    folderResources() {
      return this.filteredResources.filter(r => r.isFolder)
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

      if (!e.target.checked) {
        this.$refs.allCb.checked = false
      }
    },
    onLinkClick(e) {
      browser.tabs.create({
        url: e.target.href,
      })
      window.close()
    },
    onCategoryClick(e, category) {
      if (category === "all") {
        Object.keys(this.$refs)
          .filter(ref => ref.match(/.*Cb/))
          .forEach(ref => {
            if (Array.isArray(this.$refs[ref])) {
              // These are the actual checkboxes for the individual resources

              if (this.$refs[ref].length === 0) return // User has filtered while clicking so some refs are undefined

              const { href } = this.$refs[ref][0].dataset
              this.setResourceSelected(href, e.target.checked)
            } else {
              // This is one of the other category checkboxes
              if (this.$refs[ref] === undefined) return // User has filtered while clicking so some refs are undefined

              this.$refs[ref].checked = e.target.checked
            }
          })
      } else {
        Object.keys(this.$refs)
          .filter(ref => ref.match(new RegExp(`${category}Cb`)))
          .forEach(ref => {
            if (this.$refs[ref].length === 0) return // User has filtered while clicking so some refs are undefined

            const { href } = this.$refs[ref][0].dataset
            this.setResourceSelected(href, e.target.checked)
          })

        if (!e.target.checked) {
          this.$refs.allCb.checked = false
        }
      }
    },
  },
  mounted() {
    const height = this.$refs.selectionContainer.clientHeight

    if (height > 150) {
      this.selectionContainerStyle.height = "150px"
      this.selectionContainerStyle["overflow-y"] = "scroll"
    } else {
      this.selectionContainerStyle.height = `${height}px`
    }
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
  padding-right: 10px;
}

label.resource {
  display: grid;
  grid-template-columns: minmax(0, 10fr) 1fr 1fr;
}

label.category {
  display: grid;
  grid-template-columns: 10fr 1fr;
  font-weight: 600;
  padding: 5px 0px;
}

label:hover {
  cursor: pointer;
  background-color: #dcdcdc53;
}

label span.resource {
  text-align: left;
  word-wrap: break-word;
  padding-left: 10px;
  padding-right: 5px;
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
