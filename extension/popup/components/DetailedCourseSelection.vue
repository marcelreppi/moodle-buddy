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
      <div v-if="filteredCourses.length > 0">
        <label class="category" @input="e => onAllClick(e)">
          <span>All</span>
          <div>
            <input ref="allCb" class="mt-1" type="checkbox" />
          </div>
        </label>
        <label
          v-for="(c, i) in filteredCourses"
          :id="`courseCb${i}`"
          :key="`fileCb${i}`"
          :data-href="c.link"
          @mousemove="onMouseOver"
          @input="onCheck"
        >
          <span>{{ c.name.trim() }}</span>
          <a :href="c.link" class="link" @click.prevent="onLinkClick">Open</a>
          <div>
            <input :ref="`courseCb${i}`" :data-href="c.link" type="checkbox" class="mt-1" />
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import { DashboardCourseData } from "moodle-buddy-types"

export default defineComponent({
  props: {
    courses: {
      type: Object as PropType<DashboardCourseData[]>,
      required: true,
    },
    // setCourseSelected: {
    //   type: Function,
    //   required: true,
    // },
  },
  data() {
    return {
      mouseDown: false,
      searchInput: "",
    }
  },
  computed: {
    filteredCourses(): DashboardCourseData[] {
      if (this.searchInput === "") {
        return this.courses
      }

      return this.courses.filter(c => {
        const regex = new RegExp(this.searchInput, "gi")
        return c.name.match(regex)
      })
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
          // this.setResourceSelected(dataset.href, true)
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
        // this.setResourceSelected(dataset.href, target.checked)
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
    onAllClick(e: Event) {
      const target = e.target as HTMLInputElement

      Object.keys(this.$refs).forEach(refKey => {
        const inputRef = this.$refs[refKey] as HTMLInputElement
        if (inputRef === null) return // User has filtered while clicking so some refs are undefined

        inputRef.checked = target.checked

        // const { href } = inputRef.dataset
        // this.setResourceSelected(href, inputRef.checked)
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
label {
  display: grid;
  grid-template-columns: minmax(0, 10fr) 1fr 1fr;
  padding: 1.5px 0px;
}

label:hover {
  cursor: pointer;
  background-color: #dcdcdc53;
}

label.category {
  display: grid;
  grid-template-columns: 10fr 1fr;
  font-weight: 600;
  padding: 5px 0px;
}

label span {
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
