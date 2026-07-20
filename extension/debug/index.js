import fs from "fs"
import { JSDOM } from "jsdom"
import Course from "../src/models/Course"

const dir = "files"
const files = fs.readdirSync(dir)
// const files = ["scan_course_2020-11-03T19-11-59.html"]

const defaultOptions = {
  onlyNewResources: false,
  useMoodleFileName: true,
  showDownloadOptions: false,
  prependCourseShortcutToFileName: false,
  prependCourseNameToFileName: false,
  prependSectionToFileName: false,
  prependSectionIndexToFileName: false,
  prependFileIndexToFileName: false,
  alwaysShowDetails: false,
  disableInteractionTracking: false,
  defaultMoodleURL: "",
  autoSetMoodleURL: true,
  backgroundScanInterval: 30,
  enableBackgroundScanning: true,
  downloadFolderAsZip: true,
  saveToMoodleFolder: false,
  folderStructure: "CourseFile",
  includeVideo: true,
  includeAudio: true,
  includeImage: false,
}

async function run() {
  for (const file of files) {
    console.log("Checking", file)
    const path = `${dir}/${file}`
    const fileContent = fs.readFileSync(path, "utf8")
    const dom = new JSDOM(fileContent)
    const { document } = dom.window
    const course = new Course(path, document)
    const localStorage = { options: defaultOptions }

    let error = false

    await course.scan(localStorage)

    if (course.name === "Unknown Course") {
      console.log("Unknown Course")
      error = true
    }

    if (course.shortcut === "Unknown Shortcut") {
      console.log("Unknown Shortcut")
      error = true
    }

    const { resources } = course
    for (const r of resources) {
      if (r.fileName === "Unknown Filename") {
        console.log("Unknown Filename")
        error = true
      }

      if (r.section === "Unknown Section") {
        console.log("Unknown Section")
        error = true
      }

      if (error) {
        break
      }
    }
    if (error) {
      console.log(course.link)
      return
    }
  }

  console.log("All good!")
}

run()
