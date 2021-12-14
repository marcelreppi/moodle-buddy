import { SupportedPage } from "./extension.types"

export interface BasePayload {
  browser: "firefox" | "chrome"
  browserId: string
  dev: boolean
  version: string
}

export interface EventPayloadData {
  event: string
  url: string
  eventData: Record<string, unknown>
}
export type EventPayload = BasePayload & EventPayloadData

export interface DownloadPayloadData {
  fileCount: number
  byteCount: number
  errorCount: number
  interruptCount: number
  addCount: number
  removeCount: number
}
export type DownloadPayload = BasePayload & DownloadPayloadData

export interface PagePayloadData {
  content: string
  page: SupportedPage
}
export type PagePayload = BasePayload & PagePayloadData

export interface FeedbackPayloadData {
  subject: string
  content: string
}
export type FeedbackPayload = BasePayload & FeedbackPayloadData

export interface LogPayloadData {
  errorMessage: string
  url?: string
  fileName?: string
}
export type LogPayload = BasePayload & LogPayloadData

export type AdditionalPayloadData =
  | EventPayloadData
  | DownloadPayloadData
  | PagePayloadData
  | FeedbackPayloadData
  | LogPayloadData

export type Payload = EventPayload | DownloadPayload | PagePayload | FeedbackPayload | LogPayload
