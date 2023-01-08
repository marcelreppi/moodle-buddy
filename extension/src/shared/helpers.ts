import browser from "webextension-polyfill"
import {
  EventMessage,
  LogMessage,
  SetBadgeMessage,
  LogPayloadData,
  PageDataMessage,
  PagePayloadData,
  SupportedPage,
  ExtensionStorage,
} from "types"

import Course from "models/Course"
import { getSupportedPage } from "../content-scripts/detector"

export const isDev = process.env.NODE_ENV !== "production"
export const isDebug = process.env.NODE_ENV === "debug"

export function sendEvent(
  event: string,
  saveURL = true,
  eventData: Record<string, unknown> = {}
): void {
  browser.runtime.sendMessage({
    command: "event",
    event,
    saveURL,
    eventData,
  } satisfies EventMessage)
}

export function sendLog(logData: LogPayloadData): void {
  browser.runtime.sendMessage({
    command: "log",
    logData,
  } satisfies LogMessage)

  const page = getSupportedPage()
  if (page !== undefined) {
    sendPageData(page)
  }
}

export function sendPageData(page: SupportedPage) {
  const pageData: PagePayloadData = {
    page,
    content: document.querySelector("html")?.outerHTML || "",
  }
  browser.runtime.sendMessage({
    command: "page-data",
    pageData,
  } satisfies PageDataMessage)
}

export async function getActiveTab(): Promise<browser.Tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  return tabs?.shift()
}

declare const InstallTrigger: unknown
export const isFirefox = typeof InstallTrigger !== "undefined"

export function getUpdatesFromCourses(courses: Course[]): number {
  const courseList = courses.flat()
  const nUpdates = courseList.reduce((sum, c) => {
    const nUpdatesInCourse = [...c.resources, ...c.activities].filter((r) => r.isNew || r.isUpdated)
      .length
    return sum + nUpdatesInCourse
  }, 0)
  return nUpdates
}

export async function updateIconFromCourses(courses: Course[]) {
  const nUpdates = getUpdatesFromCourses(courses)

  await browser.storage.local.set({ nUpdates } satisfies Partial<ExtensionStorage>)

  // If there are no further updates reset the icon
  const text = nUpdates === 0 ? "" : nUpdates.toString();
  browser.runtime.sendMessage({
    command: "set-badge",
    text,
  } satisfies SetBadgeMessage)
}
