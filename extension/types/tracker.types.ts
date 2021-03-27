import { SupportedPage } from "moodle-buddy-types"

export interface Payload {
  browser: "firefox" | "chrome"
  browserId: string
  dev: boolean
}

export interface EventData {
  event: string
  url: string
  eventData: Record<string, unknown>
}

export interface DownloadData {
  fileCount: number
  byteCount: number
  errorCount: number
  interruptCount: number
  addCount: number
  removeCount: number
}

export interface PageData {
  content: string
  page: SupportedPage
}

export interface FeedbackData {
  subject: string
  content: string
}

export interface LogData {
  errorMessage: string
  url?: string
  fileName?: string
}

export type AdditionalPayload = EventData | DownloadData | PageData | FeedbackData | LogData
