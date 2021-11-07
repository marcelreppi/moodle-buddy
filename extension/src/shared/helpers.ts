import { EventMessage, LogMessage, SetBadgeMessage, LogPayloadData } from "types"

import Course from "models/Course"

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
    const { nNewFiles, nNewFolders, nNewActivities } = c.counts
    return sum + nNewFiles + nNewFolders + nNewActivities
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