import { CourseData } from "./course.types"

export interface ExtensionOptions extends browser.storage.StorageObject {
  onlyNewResources: boolean
  useMoodleFileName: boolean
  showDownloadOptions: boolean
  prependCourseShortcutToFileName: boolean
  prependCourseNameToFileName: boolean
  prependSectionToFileName: boolean
  prependSectionIndexToFileName: boolean
  prependFileIndexToFileName: boolean
  alwaysShowDetails: boolean
  disableInteractionTracking: boolean
  defaultMoodleURL: string
  autoSetMoodleURL: boolean
  backgroundScanInterval: number
  enableBackgroundScanning: boolean
  downloadFolderAsZip: boolean
  saveToMoodleFolder: boolean
  folderStructure: string
  includeVideo: boolean
  includeAudio: boolean
  includeImage: boolean
  maxConcurrentDownloads: number
  maxCoursesOnDashboardPage: number
}

export type StoredCourseData = Record<string, CourseData> & browser.storage.StorageObject

export interface ExtensionStorage extends browser.storage.StorageObject {
  options: ExtensionOptions
  browserId: string
  overviewCourseLinks: string[]
  nUpdates: number
  userHasRated: boolean
  totalDownloadedFiles: number
  rateHintLevel: number
  courseData: StoredCourseData
}

export type SupportedPage = "course" | "dashboard" | "videoservice" | undefined

export interface SelectionTab {
  id: string
  title: string
}
