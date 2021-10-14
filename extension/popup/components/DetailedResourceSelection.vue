<template>
  <div class="flex flex-col items-center pt-1">
    <input
      v-model="searchInput"
      class="w-full px-2 pb-1.5 text-sm border-b border-gray-300"
      type="text"
      placeholder="Search..."
    />
    <div
      ref="selectionContainer"
      class="flex flex-col w-full pr-3.5 mt-1 text-sm max-h-56 overflow-y-scroll scrollbar"
      @mousedown="() => setMouseDown(true)"
      @mouseup="() => setMouseDown(false)"
    >
      <div v-if="filteredResources.length > 0">
        <label class="category" @input="e => onCategoryClick(e, 'all')">
          <span>All</span>
          <div>
            <input ref="allCb" class="mt-1" type="checkbox" />
          </div>
        </label>
      </div>

      <div v-if="fileResources.length > 0">
        <label class="category" @input="e => onCategoryClick(e, 'file')">
          <span>Files</span>
          <div>
            <input ref="filesCb" class="mt-1" type="checkbox" />
          </div>
        </label>
        <label
          v-for="(r, i) in fileResources"
          :id="`fileCb${i}`"
          :key="`fileCb${i}`"
          :data-href="r.href"
          class="resource"
          @mousemove="onMouseOver"
          @input="onCheck"
        >
          <span class="resource">{{ r.name }}</span>
          <a :href="r.href" class="link" @click.prevent="onLinkClick">Open</a>
          <div>
            <input
              :ref="`fileCb${i}`"
              :data-href="r.href"
              type="checkbox"
              :checked="r.selected"
              class="mt-1"
            />
          </div>
        </label>
      </div>

      <div v-if="folderResources.length > 0">
        <label class="category" @input="e => onCategoryClick(e, 'folder')">
          <span>Folders</span>
          <div>
            <input ref="foldersCb" class="mt-1" type="checkbox" />
          </div>
        </label>
        <label
          v-for="(r, i) in folderResources"
          :id="`folderCb${i}`"
          :key="`folderCb${i}`"
          :data-href="r.href"
          class="resource"
          @mousemove="onMouseOver"
          @input="onCheck"
        >
          <span class="resource">{{ r.name || r.name }}</span>
          <a :href="r.href" class="link" @click.prevent="onLinkClick">Open</a>
          <div>
            <input
              :ref="`folderCb${i}`"
              :data-href="r.href"
              type="checkbox"
              :checked="r.selected"
              class="mt-1"
            />
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import { FileResource, FolderResource, Resource } from "types"

type CbCategory = "all" | "file" | "folder"

export default defineComponent({
  props: {
    resources: {
      type: Object as PropType<Resource[]>,
      required: true,
    },
    setResourceSelected: {
      type: Function,
      required: true,
    },
    onlyNewResources: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      mouseDown: false,
      searchInput: "",
    }
  },
  computed: {
    filteredResources(): Resource[] {
      if (this.searchInput === "") {
        if (this.onlyNewResources) {
          return this.resources.filter(r => r.isNew)
        }

        return this.resources
      }

      return this.resources.filter(r => {
        const regex = new RegExp(this.searchInput, "gi")
        const isMatch = Boolean(r.name.match(regex))

        if (this.onlyNewResources) {
          return r.isNew && isMatch
        }

        return isMatch
      })
    },
    fileResources(): Resource[] {
      return this.filteredResources.filter(r => (r as FileResource).isFile)
    },
    folderResources(): Resource[] {
      return this.filteredResources.filter(r => (r as FolderResource).isFolder)
    },
  },
  methods: {
    onMouseOver(e: Event) {
      if (this.mouseDown) {
        const target = e.target as HTMLInputElement
        const cbId = target.parentElement?.id || ""
        const cbRef = this.$refs[cbId] as HTMLInputElement
        cbRef.checked = true
        const dataset = target.parentElement?.dataset
        if (dataset && "href" in dataset) {
          this.setResourceSelected(dataset.href, true)
        }
      }
    },
    setMouseDown(isDown: boolean) {
      this.mouseDown = isDown
    },
    onCheck(e: Event) {
      const target = e.target as HTMLInputElement
      const { dataset } = target
      if (dataset && "href" in dataset) {
        this.setResourceSelected(dataset.href, target.checked)
      }

      if (!target.checked) {
        const allCbRef = this.$refs.allCb as HTMLInputElement
        allCbRef.checked = false
      }
    },
    onLinkClick(e: Event) {
      browser.tabs.create({
        url: (e.target as HTMLAnchorElement).href,
      })
      window.close()
    },
    onCategoryClick(e: Event, category: CbCategory) {
      const target = e.target as HTMLInputElement

      Object.keys(this.$refs)
        .filter(refKey => {
          const searchCategory = category === "all" ? "" : category
          return refKey.match(new RegExp(`.*${searchCategory}Cb`))
        })
        .forEach(refKey => {
          const inputRef = this.$refs[refKey] as HTMLInputElement
          if (inputRef === null) return // User has filtered while clicking so some refs are undefined

          inputRef.checked = target.checked

          const { href } = inputRef.dataset
          this.setResourceSelected(href, inputRef.checked)
        })

      if (!target.checked) {
        const allCbRef = this.$refs.allCb as HTMLInputElement
        allCbRef.checked = false
      }
    },
  },
})
</script>

<style scoped>
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
