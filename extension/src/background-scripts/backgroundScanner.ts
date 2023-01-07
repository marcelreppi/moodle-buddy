import browser from "webextension-polyfill"
import { parseHTML } from "linkedom"
import { ExtensionStorage, Message } from "types"
import { getUpdatesFromCourses } from "../shared/helpers"
import { setBadgeText } from "./helpers"
import Course from "../models/Course"
import { getURLRegex } from "../shared/regexHelpers"

// browser.storage.local.clear()

async function backgroundScan() {
  const { options, overviewCourseLinks } = (await browser.storage.local.get([
    "options",
    "overviewCourseLinks",
  ])) as ExtensionStorage

  if (!options.enableBackgroundScanning) {
    console.log("[MoodleBuddy] Background scanning disabled")
    return
  }

  console.log("[MoodleBuddy] Background scan start")
  const courses: Course[] = []
  for (const courseLink of overviewCourseLinks) {
    const res = await fetch(courseLink)

    if (res.url.match(getURLRegex("login"))) {
      console.log("Moodle Buddy background scan error: Not logged in")
      return
    }

    const resBody = await res.text()
    const { document: HTMLDocument } = parseHTML(resBody)
    const course = new Course(courseLink, HTMLDocument, options)
    await course.scan()
    courses.push(course)
  }
  console.log("[MoodleBuddy] Background scan end")

  const nUpdates = getUpdatesFromCourses(courses)

  await browser.storage.local.set({ nUpdates } as ExtensionStorage)

  console.log({ nUpdates })

  // If there are no further updates reset the icon
  if (nUpdates === 0) {
    setBadgeText("", (await browser.tabs.getCurrent())?.id)
    return
  }

  const tabs = await browser.tabs.query({})
  for (const tab of tabs) {
    if (!tab.id) continue
    browser.tabs.sendMessage(tab.id, { command: "update-non-moodle-page-badge" } as Message)
  }
}

async function startBackgroundScanning() {
  const { options } = (await browser.storage.local.get("options")) as ExtensionStorage

  if (!options) {
    setTimeout(() => {
      startBackgroundScanning()
    }, 1000)
  } else {
    setInterval(() => {
      backgroundScan()
    }, 15000)

    setInterval(backgroundScan, 1000 * 60 * options.backgroundScanInterval)
  }
}

startBackgroundScanning()
