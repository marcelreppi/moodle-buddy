import { Activity, Counts, Resource, VideoServiceResource } from "./course.types"
import { ExtensionOptions, ExtensionStorage, SupportedPage } from "./extension.types"
import { FeedbackPayloadData, LogPayloadData, PagePayloadData } from "./tracker.types"

type Command =
  | "get-state"
  | "state"
  | "event"
  | "page-data"
  | "feedback"
  | "set-badge"
  | "set-icon"
  | "error-view"
  | "log"
  | "execute-script"
  | "crawl"
  | "scan-in-progress"
  | "scan"
  | "scan-result"
  | "mark-as-seen"
  | "cancel-download"
  | "update-activities"
  | "download"
  | "download-progress"
  | "video-download-progress"
  | "clear-course-data"
  | "rate-click"
  | "avoid-rate-click"
  | "clear-course"
  | "track-page-view"

export interface Message {
  command: Command
}

export interface EventMessage extends Message {
  command: "event"
  event: string
  saveURL: boolean
  eventData?: Record<string, unknown>
}

export interface PageDataMessage extends Message {
  command: "page-data"
  pageData: PagePayloadData
}

export interface FeedbackMessage extends Message {
  command: "feedback"
  feedbackData: FeedbackPayloadData
}

export interface SetBadgeMessage extends Message {
  command: "set-badge"
  text: string
}

export interface LogMessage extends Message {
  command: "log"
  logData: LogPayloadData
}

export type ScriptName = "coursePage" | "videoservicePage" | "dashboardPage"

export interface ExecuteScriptMessage extends Message {
  command: "execute-script"
  scriptName: ScriptName
}

export interface DashboardCrawlMessage extends Message {
  command: "crawl"
  link: string
}

type CrawlOptions = Pick<
  ExtensionOptions,
  | "useMoodleFileName"
  | "prependCourseNameToFileName"
  | "prependCourseShortcutToFileName"
  | "prependSectionToFileName"
  | "prependSectionIndexToFileName"
  | "prependFileIndexToFileName"
>

export interface CourseCrawlMessage extends Message {
  command: "crawl"
  selectedResources: Resource[]
  options: CrawlOptions
}

export interface ScanInProgressMessage extends Message {
  command: "scan-in-progress"
  completed: number
  total: number
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

export interface DashboardCourseData extends CourseScanData {
  name: string
  link: string
  isNew: boolean
}

export interface DashboardScanResultMessage extends ScanResultMessage {
  courses: DashboardCourseData[]
}

export interface VideoScanResultMessage extends ScanResultMessage {
  videoResources: VideoServiceResource[]
}

export interface MarkAsSeenMessage extends Message {
  command: "mark-as-seen"
  link: string
}

export interface StateData
  extends Pick<
    ExtensionStorage,
    "options" | "nUpdates" | "userHasRated" | "totalDownloadedFiles" | "rateHintLevel"
  > {
  page: SupportedPage | undefined
}

export interface StateMessage extends Message {
  command: "state"
  state: StateData
}

export interface DownloadMessage extends Message {
  command: "download"
  courseName: string
  courseShortcut: string
  resources: Resource[]
  options: CrawlOptions
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
