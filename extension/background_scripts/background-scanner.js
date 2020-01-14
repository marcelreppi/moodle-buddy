import { loginURLRegex, getUpdatesFromCourses } from "../shared/helpers"
import { setIcon } from "./helpers"
import Course from "../models/Course"

// browser.storage.local.clear()

async function backgroundScan() {
  console.log("Scanning in background")
  const { options, overviewCourseLinks } = await browser.storage.local.get([
    "options",
    "overviewCourseLinks",
  ])

  if (!options.enableBackgroundScanning) {
    console.log("Background scanning disabled")
    // return
  }

  const courses = []
  for (const courseLink of overviewCourseLinks) {
    const domParser = new DOMParser()
    const res = await fetch(courseLink)

    if (res.url.match(loginURLRegex)) {
      console.log("Background scan error: Not logged in")
      return
    }

    const resBody = await res.text()
    const HTMLDocument = domParser.parseFromString(resBody, "text/html")
    const course = new Course(courseLink, HTMLDocument)
    await course.scan()
    courses.push(course)
  }

  console.log("Background scan done")
  const nUpdates = getUpdatesFromCourses(courses)

  // If there are no further updates reset the icon
  if (nUpdates === 0) {
    setIcon("normal", "")
  } else {
    setIcon("update", nUpdates)
  }
}

async function startBackgroundScanning() {
  const { options } = await browser.storage.local.get("options")

  if (!options) {
    setTimeout(() => {
      startBackgroundScanning()
    }, 1000)
  } else {
    // setTimeout(() => {
    //   backgroundScan()
    // }, 1000)

    setInterval(backgroundScan, 1000 * 60 * options.backgroundScanInterval)
  }
}

startBackgroundScanning()
