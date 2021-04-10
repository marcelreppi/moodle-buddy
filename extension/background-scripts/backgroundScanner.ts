import { ExtensionStorage } from "moodle-buddy-types"
import { getURLRegex, getUpdatesFromCourses } from "../shared/helpers"
import { setBadgeText } from "./helpers"
import Course from "../models/Course"

// browser.storage.local.clear()

async function backgroundScan() {
  const { options, overviewCourseLinks }: ExtensionStorage = await browser.storage.local.get([
    "options",
    "overviewCourseLinks",
  ])

  if (!options.enableBackgroundScanning) {
    console.log("Background scanning disabled")
    return
  }

  const courses = []
  for (const courseLink of overviewCourseLinks) {
    const domParser = new DOMParser()
    const res = await fetch(courseLink)

    if (res.url.match(getURLRegex("login"))) {
      console.log("Moodle Buddy background scan error: Not logged in")
      return
    }

    const resBody = await res.text()
    const HTMLDocument = domParser.parseFromString(resBody, "text/html")
    const course = new Course(courseLink, HTMLDocument)
    await course.scan()
    courses.push(course)
  }

  const nUpdates = getUpdatesFromCourses(courses)

  browser.storage.local.set({ nUpdates })

  // If there are no further updates reset the icon
  if (nUpdates === 0) {
    setBadgeText("")
  } else {
    setBadgeText(nUpdates.toString())
  }
}

async function startBackgroundScanning() {
  const { options }: ExtensionStorage = await browser.storage.local.get("options")

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
