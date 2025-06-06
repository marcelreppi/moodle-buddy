import { CourseData } from "./course.types"

export type FolderStructure = "CourseFile" | "CourseSectionFile"

export interface ExtensionOptions {
  onlyNewResources: boolean
  useMoodleFileName: boolean
  showDownloadOptions: boolean
  prependCourseShortcutToFileName: boolean
  prependCourseNameToFileName: boolean
  prependSectionToFileName: boolean
  prependSectionIndexToFileName: boolean
  prependFileIndexToFileName: boolean
  prependLastModifiedToFileName: boolean
  alwaysShowDetails: boolean
  disableInteractionTracking: boolean
  defaultMoodleURL: string
  autoSetMoodleURL: boolean
  /**
   * Background scanning interval in minutes
   */
  backgroundScanInterval: number
  enableBackgroundScanning: boolean
  downloadFolderAsZip: boolean
  saveToMoodleFolder: boolean
  folderStructure: FolderStructure
  includeVideo: boolean
  includeAudio: boolean
  includeImage: boolean
  maxConcurrentDownloads: number
  maxCoursesOnDashboardPage: number
  detectFileUpdates: boolean
  customSelectorCourseName: string
  customSelectorCourseShortcut: string
  customSelectorSectionElement: string
  customSelectorSectionName: string
}

export type StoredCourseData = Record<string, CourseData>

export interface ExtensionStorage {
  options: ExtensionOptions
  browserId: string
  overviewCourseLinks: string[]
  nUpdates: number
  userHasRated: boolean
  totalDownloadedFiles: number
  rateHintLevel: number
  courseData: StoredCourseData
  /**
   * Timestamp of last background scan in milliseconds
   */
  lastBackgroundScanMillis: number
}

export type SupportedPage = "course" | "dashboard" | "videoservice"

export interface SelectionTab {
  id: string
  title: string
}
