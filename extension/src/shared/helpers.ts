import {
  EventMessage,
  LogMessage,
  SetBadgeMessage,
  LogPayloadData,
  PageDataMessage,
  PagePayloadData,
  SupportedPage,
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
  browser.runtime.sendMessage<EventMessage>({
    command: "event",
    event,
    saveURL,
    eventData,
  })
}

export function sendLog(logData: LogPayloadData): void {
  browser.runtime.sendMessage<LogMessage>({
    command: "log",
    logData,
  })

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
  browser.runtime.sendMessage<PageDataMessage>({
    command: "page-data",
    pageData,
  })
}

export async function getActiveTab(): Promise<browser.tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  return tabs.shift()
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

export function updateIconFromCourses(courses: Course[]): void {
  const nUpdates = getUpdatesFromCourses(courses)

  // If there are no further updates reset the icon
  if (nUpdates === 0) {
    browser.runtime.sendMessage<SetBadgeMessage>({
      command: "set-badge",
      text: "",
    })
  } else {
    browser.runtime.sendMessage<SetBadgeMessage>({
      command: "set-badge",
      text: nUpdates.toString(),
    })
  }
}
