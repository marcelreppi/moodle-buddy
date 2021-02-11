import { Activity, Counts, Resource } from "extension/models/Course.types"
import { ExtensionOptions } from "./extension.types"
import { FeedbackData, LogData, PageData } from "./tracker.types"

export interface Message {
  command: string
}

export interface EventMessage extends Message {
  command: "event"
  event: string
  saveURL: boolean
  eventData: Record<string, unknown>
}

export interface PageDataMessage extends Message {
  command: "page-data"
  pageData: PageData
}

export interface FeedbackMessage extends Message {
  command: "feedback"
  feedbackData: FeedbackData
}

export interface SetBadgeMessage extends Message {
  command: "set-badge"
  text: string
}

export interface SetIconMessage extends Message {
  command: "set-icon"
}

export interface ErrorViewMessage extends Message {
  command: "error-view"
}

export interface LogMessage extends Message {
  command: "log"
  logData: LogData
}

export interface ExecuteScriptMessage extends Message {
  command: "execute-script"
  scriptName: string
}

export interface DashboardCrawlMessage extends Message {
  command: "crawl"
  link: string
}

export interface CourseCrawlMessage extends Message {
  command: "crawl"
  selectedResources: Resource[]
  options: ExtensionOptions
}

export interface ScanInProgressMessage extends Message {
  command: "scan-in-progress"
  completed: number
  total: number
}

export interface ScanMessage extends Message {
  command: "scan"
}

export interface ScanResultMessage extends Message {
  command: "scan-result"
}

interface CourseScanData {
  resources: Resource[]
  activities: Activity[]
  counts: Counts
}

export interface CourseScanResultMessage extends ScanResultMessage {
  course: CourseScanData
}

interface DashboardCourseData extends CourseScanData {
  name: string
  link: string
  isNew: boolean
}

export interface DashboardScanResultMessage extends ScanResultMessage {
  courses: DashboardCourseData[]
}

export interface VideoScanResultMessage extends ScanResultMessage {
  videoResources: Resource[]
}

export interface MarkAsSeenMessage extends Message {
  command: "mark-as-seen"
  link: string
}

export interface CancelDownloadMessage extends Message {
  command: "cancel-download"
}

export interface StateMessage extends Message {
  command: "state"
  page: string
  options: ExtensionOptions
  nUpdates: number
  userHasRated: boolean
  totalDownloadedFiles: number
  rateHintLevel: number
}

export interface DownloadMessage extends Message {
  command: "download"
  courseName: string
  courseShortcut: string
  resources: Resource[]
  options: ExtensionOptions
}

export interface DownloadProgressMessage extends Message {
  command: "download-progress"
  completed: number
  total: number
  errors: number
}

export interface VideoDownloadProgressMessage extends Message {
  command: "video-download-progress"
  completed: number
  total: number
}
