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
        <label class="category" @input="(e) => onCategoryClick(e, 'all')">
          <span>All</span>
          <div>
            <input :ref="setCbRef('allCb')" class="mt-1" type="checkbox" />
          </div>
        </label>
      </div>

      <div v-if="fileResources.length > 0">
        <label class="category" @input="(e) => onCategoryClick(e, 'file')">
          <span>Files</span>
          <div>
            <input :ref="setCbRef('filesCb')" class="mt-1" type="checkbox" />
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
              :ref="setCbRef(`fileCb${i}`)"
              :data-href="r.href"
              type="checkbox"
              :checked="r.selected"
              class="mt-1"
            />
          </div>
        </label>
      </div>

      <div v-if="folderResources.length > 0">
        <label class="category" @input="(e) => onCategoryClick(e, 'folder')">
          <span>Folders</span>
          <div>
            <input :ref="setCbRef('foldersCb')" class="mt-1" type="checkbox" />
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
              :ref="setCbRef(`folderCb${i}`)"
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

<script setup lang="ts">
import { Resource } from "types"
import { computed, reactive, ref } from "vue"
import {
  isFile,
  isFolder,
  isVideoServiceVideo,
  setResourceSelected,
} from "../../shared/resourceHelpers"
import useNavigation from "../composables/useNavigation"
import { onlyNewResources } from "../state"

type CbCategory = "all" | "file" | "folder"

const props = defineProps<{
  resources: Resource[]
}>()

const mouseDown = ref(false)
const searchInput = ref("")

const allCb = ref<HTMLInputElement>()
const cbRefs = reactive<Record<string, any>>({})
const setCbRef = (key: string) => (el: any) => (el ? (cbRefs[key] = el) : null)

const filteredResources = computed(() => {
  if (searchInput.value === "") {
    if (onlyNewResources.value) {
      return props.resources.filter((r) => r.isNew)
    }

    return props.resources
  }

  return props.resources.filter((r) => {
    const regex = new RegExp(searchInput.value, "gi")
    const isMatch = Boolean(r.name.match(regex))

    if (onlyNewResources.value) {
      return r.isNew && isMatch
    }

    return isMatch
  })
})
const fileResources = computed(() =>
  filteredResources.value.filter((r) => isFile(r) || isVideoServiceVideo(r))
)
const folderResources = computed(() => filteredResources.value.filter(isFolder))

const onMouseOver = (e: Event) => {
  if (mouseDown.value) {
    const target = e.target as HTMLInputElement
    target.checked = true
    const dataset = target.parentElement?.dataset
    if (dataset && "href" in dataset) {
      setResourceSelected(props.resources, dataset.href ?? "", true)
    }
  }
}

const setMouseDown = (isDown: boolean) => (mouseDown.value = isDown)

const onCheck = (e: Event) => {
  const target = e.target as HTMLInputElement
  const { dataset } = target
  if (dataset && "href" in dataset) {
    setResourceSelected(props.resources, dataset.href ?? "", target.checked)
  }

  if (!target.checked && allCb.value) {
    allCb.value.checked = false
  }
}

const { openURL } = useNavigation()
const onLinkClick = (e: Event) => openURL((e.target as HTMLAnchorElement).href)

const onCategoryClick = (e: Event, category: CbCategory) => {
  const target = e.target as HTMLInputElement
  Object.keys(cbRefs)
    .filter((refKey) => {
      const searchCategory = category === "all" ? "" : category
      return refKey.match(new RegExp(`.*${searchCategory}Cb`))
    })
    .forEach((refKey) => {
      const inputRef = cbRefs[refKey] as HTMLInputElement
      if (inputRef === null) return // User has filtered while clicking so some refs are undefined
      inputRef.checked = target.checked
      const { href } = inputRef.dataset
      setResourceSelected(props.resources, href ?? "", inputRef.checked)
    })
  if (!target.checked && allCb.value) {
    allCb.value.checked = false
  }
}
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
