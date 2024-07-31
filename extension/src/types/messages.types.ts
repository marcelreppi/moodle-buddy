import { COMMANDS } from "@shared/constants"
import { Activity, Resource, VideoServiceResource } from "./course.types"
import { ExtensionOptions, ExtensionStorage, SupportedPage } from "./extension.types"
import { FeedbackPayloadData, LogPayloadData, PagePayloadData } from "./tracker.types"

type Command = (typeof COMMANDS)[keyof typeof COMMANDS]

export interface Message {
  command: Command
}

export interface EventMessage extends Message {
  command: typeof COMMANDS.EVENT
  event: string
  saveURL: boolean
  eventData?: Record<string, any>
}

export interface PageDataMessage extends Message {
  command: typeof COMMANDS.PAGE_DATA
  pageData: PagePayloadData
}

export interface FeedbackMessage extends Message {
  command: typeof COMMANDS.FEEDBACK
  feedbackData: FeedbackPayloadData
}

export interface SetBadgeMessage extends Message {
  command: typeof COMMANDS.SET_BADGE
  text: string
  global: boolean
}

export interface LogMessage extends Message {
  command: typeof COMMANDS.LOG
  logData: LogPayloadData
}

export type ScriptName = "coursePage" | "videoservicePage" | "dashboardPage"

export interface ExecuteScriptMessage extends Message {
  command: typeof COMMANDS.EXECUTE_SCRIPT
  scriptName: ScriptName
}

export interface DashboardDownloadCourseMessage extends Message {
  command: typeof COMMANDS.DASHBOARD_DOWNLOAD_NEW | typeof COMMANDS.DASHBOARD_DOWNLOAD_COURSE
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
  command: typeof COMMANDS.COURSE_CRAWL
  selectedResources: Resource[]
  options: CrawlOptions
}

export interface ScanInProgressMessage extends Message {
  command: typeof COMMANDS.SCAN_IN_PROGRESS
  completed: number
  total: number
}

export interface ScanResultMessage extends Message {
  command: typeof COMMANDS.SCAN_RESULT
}

interface CourseScanData {
  resources: Resource[]
  activities: Activity[]
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

export interface DashboardUpdateCourseMessage extends Message {
  command: typeof COMMANDS.DASHBOARD_UPDATE_COURSE
  course: DashboardCourseData
}

export interface VideoScanResultMessage extends ScanResultMessage {
  videoResources: VideoServiceResource[]
}

export interface MarkAsSeenMessage extends Message {
  command: typeof COMMANDS.MARK_AS_SEEN
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
  command: typeof COMMANDS.STATE
  state: StateData
}

export interface DownloadMessage extends Message {
  command: typeof COMMANDS.DOWNLOAD
  id: string
  courseLink: string
  courseName: string
  courseShortcut: string
  resources: Resource[]
  options: CrawlOptions
}

export interface DownloadProgressMessage extends Message {
  command: typeof COMMANDS.DOWNLOAD_PROGRESS
  id: string
  courseName: string
  courseLink: string
  isDone: boolean
  completed: number
  total: number
  errors: number
  isPending?: boolean
}

export interface VideoDownloadProgressMessage extends Message {
  command: typeof COMMANDS.VIDEO_DOWNLOAD_PROGRESS
  completed: number
  total: number
}

export interface BackgroundCourseScanMessage extends Message {
  command: typeof COMMANDS.BG_COURSE_SCAN
  href: string
  html: string
}

export interface BackgroundCourseScanResultMessage extends Message {
  command: typeof COMMANDS.BG_COURSE_SCAN_RESULT
  href: string
  nUpdates: number
}
